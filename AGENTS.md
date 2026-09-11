# AGENTS.md

Guidance for AI agents working in this repository. Humans should read
[README.md](./README.md); this file captures the project facts and the
**correct local development workflow** an agent needs to be productive without
rediscovering them.

## Agent rules

- **Load the `pebble-watchface` skill before doing any work in this repo.** If
  it isn't already available, install it from
  https://github.com/coredevices/pebble-watchface-agent-skill/ first.
- **Commit messages** must follow
  [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
- **PR descriptions**: max 100 words. **Inline comments**: max 30 words. If
  more detail is needed, add a doc under `docs/` and reference it instead of
  writing long comments/descriptions.

## Project overview

- **Carbon** is a weather-focused Pebble watchface. Live weather comes from the
  free [Open-Meteo](https://open-meteo.com) API, fetched phone-side in PebbleKit
  JS and pushed to the watch via AppMessage.

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
    index.js              # Phone-side weather/location fetch + AppMessage forwarding
    config.js             # Clay settings page definition
    openmeteo-weather.js  # Open-Meteo weather source (default)
    dwd-weather.js        # DWD weather source, via Bright Sky (opt-in)
package.json      # Pebble metadata: messageKeys, resources, platforms
```

## Demo builds & screenshots

Real weather/timezone data isn't available in the emulator. Use demo builds:

```sh
DEMO=1 pebble build                                   # inject demo data
DEMO=1 pebble build && pebble screenshot --all-platforms
```

See `src/c/modules/demo.c` for available scenarios. Run `pebble wipe` if the
emulator stalls.

## Install on a real device

```sh
pebble login                  # GitHub auth, once after SDK install
pebble install --cloudpebble  # push to a paired device via the phone app
```

## Icons

Icons are a custom font generated from [IcoMoon](https://icomoon.io/), built
from the [Carbon Design System](https://carbondesignsystem.com/elements/icons/library/)
icon set (name is a coincidence — the upstream watchface this was forked from
predates that discovery).

To edit the icon set: import `resources/fonts/icons.icomoon.json` into
IcoMoon, re-export TTF + JSON with font family "IcoMoon", then replace:
- `resources/fonts/IcoMoon-Regular.ttf` (the `-Regular` suffix is required)
- `resources/fonts/icons.icomoon.json`

Then regenerate the C reference table:

```sh
npm run gen-icons   # updates src/c/generated/icons.h (ICON_<NAME> constants)
```
