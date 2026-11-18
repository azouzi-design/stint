// Stint desktop widget: a thin native shell around the prototype's timer page (`/?widget`).
// The shell owns only what a web page can't do: a frameless, always-on-top window, the
// menu bar / tray icon, native notifications, updates and stint:// links. The timer itself is the web page.
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

fn show_widget(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("widget") {
        let _ = w.show();
        let _ = w.set_focus();
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
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        // Updates: the widget page decides when (only while no session runs), see prototype/widget/updater.ts.
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Mac: no Dock icon, lives in the menu bar (also lets it float over fullscreen apps).
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // The installer registers stint:// on Windows; this also covers dev runs and Linux.
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }

            let win = WebviewWindowBuilder::new(app, "widget", WebviewUrl::External(WIDGET_URL.parse()?))
                .title("Stint")
                .inner_size(WIDTH, HEIGHT)
                .resizable(false)
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
