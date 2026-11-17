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

## Release (Mac + Windows, with auto-update)

1. Bump `version` in `src-tauri/tauri.conf.json` (and `package.json`, `src-tauri/Cargo.toml` to match). Commit + push.
2. Run the **Desktop release** workflow: GitHub → Actions → Desktop release → Run workflow
   (or `gh workflow run desktop-release.yml`).

It builds the universal Mac app (Apple Silicon + Intel) and the Windows installer on GitHub's servers, and
publishes release `desktop-v<version>` with:
- `Stint-mac.dmg` / `Stint-windows.exe`: what the web app's Download button links to (`releases/latest/download/…`);
- the signed update bundles + `latest.json`, which installed apps check (at launch, then every 3 h) and install
  **only while no session is running** (`prototype/widget/updater.ts`).

Most changes don't need a release at all: the timer UI is loaded from the website, so a Vercel deploy is enough.
Release only when `src-tauri/` changes (window, tray, plugins, permissions).

**Updater signing key:** `~/.tauri/stint-updater.key` (private, also the repo secret `TAURI_SIGNING_PRIVATE_KEY`).
Keep a backup in a password manager: without it, installed apps can never receive updates again.
The public half is in `tauri.conf.json` (`plugins.updater.pubkey`).

**Unsigned for now:** Mac shows "Open Anyway" (System Settings → Privacy & Security) on first launch,
Windows shows "Windows protected your PC" → More info → Run anyway. Updates don't show these again.

**Local build** (to try a build without releasing): `npx tauri build --target universal-apple-darwin`
(needs `rustup target add x86_64-apple-darwin` once). Output: `src-tauri/target/universal-apple-darwin/release/bundle/`.

## Notes

- App ID `app.stint.desktop`: keep it, changing it makes macOS / Windows treat it as a different app.
- Icons are generated from `icon-source.svg` with `npm run icons`.
- What the page may ask the shell to do is listed in `src-tauri/capabilities/widget.json`.
