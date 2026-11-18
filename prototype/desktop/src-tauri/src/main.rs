// Stint desktop widget: a thin native shell around the prototype's timer page (`/?widget`).
// The shell owns only what a web page can't do: a frameless, always-on-top window, the
// menu bar / tray icon, native notifications, updates, stint:// links and opening at login. The timer itself is the web page.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    AppHandle, LogicalPosition, Manager, WebviewUrl, WebviewWindowBuilder,
    tray::TrayIconBuilder,
};

/// Dev: the local prototype server (`npm run proto`). Built app: the deployed prototype.
const WIDGET_URL: &str = if cfg!(debug_assertions) {
    "http://localhost:5174/?widget"
} else {
    "https://stint-prototype.vercel.app/?widget"
};

// Starting size only: the page fits the window to its content once it loads.
const WIDTH: f64 = 130.0;
const HEIGHT: f64 = 34.0;

/// Mac: by default, macOS doesn't show a notification from the app that's in front (it only
/// goes to Notification Center), and the notification library never asks otherwise. Stint is in
/// front at time's up (the widget comes forward), so its "Time's up" was never seen. This adds
/// the answer "show it" to the library's notification delegate (mac-notification-sys's
/// `NotificationCenterDelegate`). Must run before the first notification.
#[cfg(target_os = "macos")]
fn show_notifications_in_front() {
    use std::ffi::{c_char, c_void};
    #[link(name = "objc", kind = "dylib")]
    extern "C" {
        fn objc_getClass(name: *const c_char) -> *mut c_void;
        fn sel_registerName(name: *const c_char) -> *const c_void;
        fn class_addMethod(class: *mut c_void, sel: *const c_void, imp: *const c_void, types: *const c_char) -> bool;
    }
    // -userNotificationCenter:shouldPresentNotification: → YES
    extern "C" fn yes(_this: *mut c_void, _cmd: *const c_void, _center: *mut c_void, _note: *mut c_void) -> bool {
        true
    }
    unsafe {
        let class = objc_getClass(c"NotificationCenterDelegate".as_ptr());
        if !class.is_null() {
            let sel = sel_registerName(c"userNotificationCenter:shouldPresentNotification:".as_ptr());
            class_addMethod(class, sel, yes as *const c_void, c"B@:@@".as_ptr());
        }
    }
}

fn show_widget(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("widget") {
        let _ = w.unminimize(); // in case it was minimized into the Dock before 0.2.3
        let _ = w.show();
        let _ = w.set_focus();
    }
}

/// Stint only works while the app runs, so it opens at login. Switched on once (first launch of
/// 0.2.2+); if the user later turns it off in their system settings, that choice stays.
fn open_at_login_once(app: &AppHandle) {
    use tauri_plugin_autostart::ManagerExt;
    // Mac: not while running from the mounted .dmg (the login item would point at a vanished disk).
    if std::env::current_exe().map_or(true, |p| p.starts_with("/Volumes")) {
        return;
    }
    let Ok(dir) = app.path().app_config_dir() else { return };
    let marker = dir.join("open-at-login-set");
    if marker.exists() {
        return;
    }
    if app.autolaunch().enable().is_ok() {
        let _ = std::fs::create_dir_all(&dir);
        let _ = std::fs::write(&marker, "");
    }
}

fn main() {
    let builder = tauri::Builder::default();
    // Must come first. Windows/Linux: a stint:// link opens a 2nd copy; it hands the link over and quits.
    #[cfg(any(windows, target_os = "linux"))]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_widget(app)));
    builder
        // stint://auth?… : one-click sign-in from the web app, handled by the page (lib/desktopLink.ts).
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        // Updates: the widget page decides when (only while no session runs), see prototype/widget/updater.ts.
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Mac: no Dock icon, lives in the menu bar (also lets it float over fullscreen apps).
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            #[cfg(target_os = "macos")]
            show_notifications_in_front();

            // The installer registers stint:// on Windows; this also covers dev runs and Linux.
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }

            open_at_login_once(app.handle());

            let win = WebviewWindowBuilder::new(app, "widget", WebviewUrl::External(WIDGET_URL.parse()?))
                .title("Stint")
                .inner_size(WIDTH, HEIGHT)
                .resizable(false)
                // No ⌘M into the Dock: it's hidden with "Hide timer" and comes back from the menu bar.
                .minimizable(false)
                .decorations(false)
                .transparent(true)
                .shadow(true)
                .always_on_top(true)
                .visible_on_all_workspaces(true)
                .skip_taskbar(true)
                .build()?;

            // Start in the top-right corner of the main screen.
            if let Some(m) = win.primary_monitor()? {
                let scale = m.scale_factor();
                let screen_w = m.size().width as f64 / scale;
                win.set_position(LogicalPosition::new(screen_w - WIDTH - 16.0, 48.0))?;
            }

            let show = MenuItem::with_id(app, "show", "Show timer", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Stint", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;
            TrayIconBuilder::with_id("stint")
                .icon(app.default_window_icon().cloned().expect("app icon"))
                .tooltip("Stint")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_widget(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Stint");
}
