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

## Build and release (Mac)

```sh
rustup target add x86_64-apple-darwin                 # once: Intel Macs too
npx tauri build --target universal-apple-darwin       # Apple Silicon + Intel in one app
```

The `.dmg` lands in `src-tauri/target/universal-apple-darwin/release/bundle/dmg/`. Built apps load
https://stint-prototype.vercel.app/?widget, so most changes ship with the website, no new build needed.

Publish it as a GitHub Release with the asset named **`Stint-mac.dmg`**: the web app's Download button
points to `releases/latest/download/Stint-mac.dmg`, so it always serves the newest release.

```sh
cp src-tauri/target/universal-apple-darwin/release/bundle/dmg/Stint_*.dmg Stint-mac.dmg
gh release create v0.1.1 Stint-mac.dmg --title "Stint desktop 0.1.1" --notes "…"
```

Bump `version` in `src-tauri/tauri.conf.json` first. Unsigned for now: on first launch macOS blocks it,
then System Settings → Privacy & Security → "Open Anyway". Windows: not built yet (needs a Windows machine).

## Notes

- App ID `app.stint.desktop`: keep it, changing it makes macOS / Windows treat it as a different app.
- Icons are generated from `icon-source.svg` with `npm run icons`.
- What the page may ask the shell to do is listed in `src-tauri/capabilities/widget.json`.
