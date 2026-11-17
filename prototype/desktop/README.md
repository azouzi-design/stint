# Stint desktop widget (prototype)

A thin [Tauri](https://tauri.app) shell around the prototype's timer page (`/?widget`, code in `prototype/widget/`).
The shell only does what a web page can't: a frameless always-on-top window, the menu bar / tray icon, and native notifications.

## Run (development)

Needs Rust (`rustup`) and Node.

```sh
npm run proto              # from the repo root: the prototype on http://localhost:5174
cd prototype/desktop
npm install                # first time only
npm run dev                # opens the widget, loading http://localhost:5174/?widget
```

Timer UI changes reload live. Changes to `src-tauri/` rebuild and restart the app.
The widget can also be previewed in a browser at http://localhost:5174/?widget.

## Build

`npm run build` makes `Stint.app` and a `.dmg` (in `src-tauri/target/release/bundle/`), which load
https://stint-prototype.vercel.app/?widget. Unsigned for now: on first launch macOS blocks it, then
System Settings → Privacy & Security → "Open Anyway".

## Notes

- App ID `app.stint.desktop`: keep it, changing it makes macOS / Windows treat it as a different app.
- Icons are generated from `icon-source.svg` with `npm run icons`.
- What the page may ask the shell to do is listed in `src-tauri/capabilities/widget.json`.
