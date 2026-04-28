# Carbon

A feature-rich, highly configurable Pebble watchface for **Pebble Time 2** and **Pebble Round 2**, built with the [Alloy](https://developer.repebble.com/guides/alloy/) JavaScript framework.

Features a 24-hour precipitation probability graph, modular widget slots, configurable date/time formats, and live weather via the free [Open-Meteo](https://open-meteo.com) API.

Inspired by [Graphite](https://github.com/stefanheule/graphite) by Stefan Heule.

---

## Development

### Prerequisites

- [Pebble SDK](https://developer.repebble.com/sdk/) (includes the `pebble` CLI tool)
- [Node.js](https://nodejs.org) (for PKJS dependencies)

### Install dependencies

```sh
npm install
```

### Build & run in emulator

```sh
npm run build

# Pebble Time 2 (rectangular)
npm run emulator:emery

# Pebble Round 2 (circular)
npm run emulator:gabbro
```

### Install on your device

If you want to be able to run the watchface on your device, you'll also want to log in with GitHub after installing the Pebble SDK:

```sh
pebble login
```

This will enable the `device` npm script:

```sh
npm run device
```

### Project Structure

```
scripts/           # Build/util scripts (e.g. icon codepoint generation)
src/
  embeddedjs/      # Watch-side JavaScript (runs on device)
    assets/        # Fonts and other static resources
    modules/       # Shared non-widget modules (icons, weather, settings, etc.)
    widgets/       # Modular widget components
    main.js        # Entry point
    assets.js      # Shared asset config (fonts, skins, styles)
  pkjs/
    index.js       # Phone-side proxy + Clay settings init
    config.js      # Clay settings configuration
```

### Icons

Icons are included as a custom font generated from [IcoMoon](https://icomoon.io/). The `src/embeddedjs/assets/icons.icomoon.json` file can be imported into IcoMoon to edit the icon set. When icons are added, removed, or rearranged, the font and selection JSON file must be re-exported from IcoMoon (with font family set to "IcoMoon"), and the codepoints file must be regenerated.

Move the downloaded TTF font file to `src/embeddedjs/assets/IcoMoon-Regular.ttf` (the `-Regular` suffix is important!) and the JSON selection file to `src/embeddedjs/assets/icons.icomoon.json`, then run:

```sh
npm run gen-icons
```

This will update `src/embeddedjs/modules/icons/codepoints.js` with the new codepoint mapping. The icons module re-exports this mapping as its default export, so any changes will be reflected in the watchface immediately (or you'll get a runtime error if a codepoint is missing or the file is otherwise malformed).

### Troubleshooting

#### Module specifiers must exactly match manifest keys

The Moddable/mcrun build does **not** validate import specifiers at compile time. Mismatches only surface at runtime as `SyntaxError: import default not found` (module found but no default export) or a silent failure.

**Rule:** The string in `import X from "..."` must exactly match a key in
`src/embeddedjs/manifest.json` under `modules`.

There are two ways a module can be declared:

```jsonc
// manifest.json
{
  "modules": {
    // Named key — import from "icons", NOT "modules/icons"
    "example": "./modules/example",

    // Named key with wildcard — import from "modules/clock", NOT "clock"
	"modules/*": "./modules/*",

    // Wildcard array — import specifier is the path stripped of "./" and ".js"
    // e.g. "./assets" → import from "assets"
    "*": [
      "./main",
      "./assets"
    ]
  }
}
```

When in doubt, grep the manifest for the key and make sure your import string matches it literally.

#### Build environment: settings.json

If `npm run build` fails with `json.decoder.JSONDecodeError: Expecting value`, the Pebble SDK config file has been zeroed out (for some reason?). Fix with:

```sh
echo '{}' > ~/Library/Application\ Support/Pebble\ SDK/settings.json
```

---

## License

[GPL-3.0](LICENSE)
