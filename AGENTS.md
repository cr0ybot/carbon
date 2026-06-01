# AGENTS.md

Guidance for AI agents working in this repository. Humans should read
[README.md](./README.md); this file captures the project facts and the
**correct local development workflow** an agent needs to be productive without
rediscovering them.

## Project overview

- **Carbon** is a weather-focused Pebble watchface. Live weather comes from the
  free [Open-Meteo](https://open-meteo.com) API, fetched phone-side in PebbleKit
  JS and pushed to the watch via AppMessage.
- UUID `4a34b9c0-93b3-43ff-b1ba-a19d00cbcc60`, current version in
  `package.json`.
- Target platforms: `aplite`, `basalt`, `diorite`, `emery`, `flint`. Prefer
  **emery** (Pebble Time 2, color, 200×228) for visual checks and **flint**
  (Pebble 2 Duo, monochrome) for the B/W layout.
- Settings UI is built with [Clay](https://github.com/pebble-dev/clay)
  (`@rebble/clay`), configured in `src/pkjs/config.js`.

## Repository layout

```
resources/        # Static assets (icon font, images)
scripts/          # Utility scripts (e.g. gen-icons.js)
src/
  c/
    generated/    # Generated C (e.g. icons.h from the icon font)
    modules/      # C modules: settings, weather, demo, etc.
    ui/           # Custom UI widgets (graph, time_layer, event layer)
    main.c        # C entrypoint
  pkjs/
    index.js      # Phone-side weather/location fetch + AppMessage forwarding
    config.js     # Clay settings page definition
package.json      # Pebble metadata: messageKeys, resources, platforms
```

## Build & run

Use the `pebble` CLI (from the Pebble SDK). Node is only needed for PKJS deps
and `gen-icons`.

```sh
pebble build                              # compile for all target platforms
pebble install --emulator emery --logs    # install + stream logs (color)
pebble install --emulator flint --logs    # install + stream logs (mono)
```

- After editing C or PKJS code, always `pebble build` before `pebble install`.
- `pebble logs --emulator <platform>` streams JS `console.log` and
  `APP_LOG` output. App logs from this watchface are prefixed `Carbon:`.
- `pebble screenshot --emulator <platform> out.png` captures the current frame.

### Emulator hygiene (important)

- **Never `kill -9` the emulator.** Use `pebble kill` to shut it down cleanly.
  A hard kill can corrupt the emulator flash (`qemu_spi_flash.bin`); if the
  emulator stalls or behaves oddly, run `pebble wipe` (or remove the stale
  `qemu_spi_flash.bin`) and retry.
- When running long-lived commands from an agent, start them detached
  (e.g. `nohup ... & disown`) so streaming logs don't block the session.

## Settings / config page workflow

The config flow on a **real watch**: tap *Settings* → Clay opens the page → tap
**Save** → page navigates to `pebblejs://close#<json>` → PebbleKit JS gets the
`webviewclosed` event → `index.js` forwards values to the watch via
`sendAppMessage`. No special handling is needed on a device.

In the **emulator**:

```sh
pebble emu-app-config --emulator emery
```

This **works by default.** It starts a local web server with a `/close`
endpoint and opens the Clay config page in your real browser. Clay, on the
emulator, points the browser at
`http://clay.pebble.com.s3-website-us-west-2.amazonaws.com/#…` and embeds the
page HTML in the URL fragment. That S3 proxy **is alive** and substitutes the
`$$RETURN_TO$$` placeholder with the local `?return_to=` value, so **Save**
correctly posts back to `/close`, which delivers the JSON to the emulator.

> Pitfall for agents: do **not** "capture" the config URL and render the page
> yourself (e.g. via a fake `$BROWSER` script + local renderer). That bypasses
> the live S3 proxy, leaves `$$RETURN_TO$$` unsubstituted, and makes the
> roundtrip look broken when it is not. Let a real browser open the URL.

### Clay settings gotcha (`getSettings`)

`index.js` calls `clay.getSettings(e.response, false)` with `convert=false`.
With `convert=false`, toggle (boolean) values arrive as **objects**
(`{ value: false }`), not raw booleans — and an object is always truthy. Always
unwrap `.value` before sending to the watch (guarding string `"false"`/`"0"`);
a naive `value ? 1 : 0` will always send `1`. See the `extractBool()` helper in
`src/pkjs/index.js`.

### Adding a setting (checklist)

1. `package.json` → add the key to `pebble.messageKeys`
   (e.g. `SETTING_SHOW_TIMEZONE`).
2. `src/pkjs/config.js` → add the Clay control with matching `messageKey`.
3. `src/pkjs/index.js` → forward the value in `webviewclosed`
   (unwrap booleans via `extractBool`).
4. `src/c/modules/settings.h` → add the struct field.
5. `src/c/modules/settings.c` → set a default and parse the inbound tuple.
6. Consume the field where it affects rendering (e.g. `src/c/ui/time_layer.c`).

> The settings struct is persisted with a size guard: if the stored size does
> not match the current struct, old data is discarded and defaults are used.
> This is intentional and avoids reading stale/misaligned settings after a
> schema change — expect settings to reset to defaults after adding a field.

## Demo builds & screenshots

Real weather/timezone data isn't available in the emulator. Use demo builds:

```sh
DEMO=1 pebble build                                   # inject demo data
DEMO=1 pebble build && pebble screenshot --all-platforms
```

See `src/c/modules/demo.c` for available scenarios. Run `pebble wipe` if the
emulator stalls.

> Emulator caveat: `strftime("%Z")` returns an **empty** timezone abbreviation
> in the emulator, so the timezone indicator has nothing to draw there even when
> enabled. Verify timezone-dependent UI with a `DEMO` build (which injects a
> timezone) or on a real device. The AM/PM (12h/24h) indicator *is* visible in
> the plain emulator.

## Install on a real device

```sh
pebble login                  # GitHub auth, once after SDK install
pebble install --cloudpebble  # push to a paired device via the phone app
```

## Icons

Icons are a custom font generated from [IcoMoon](https://icomoon.io/). After
editing the icon set (import `resources/fonts/icons.icomoon.json` into IcoMoon,
re-export TTF + JSON with font family "IcoMoon", replace the files), regenerate
the C reference table:

```sh
npm run gen-icons   # updates src/c/generated/icons.h (ICON_<NAME> constants)
```

## Conventions

- **Commit messages:** lowercase Conventional-Commit prefixes (`feat:`,
  `chore:`, `fix:`).
- **Pull requests:** create only when explicitly asked, and always as
  **drafts** (`gh pr create --draft`).
- Keep production code changes minimal; prefer documenting dev/test workflow
  here or in the README over adding emulator-only hacks to the watchface code.
