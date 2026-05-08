# Carbon - Pebble Weather Watchface

A feature-rich, highly readable-at-a-glance Pebble watchface focused on the day ahead, with live weather via the free [Open-Meteo](https://open-meteo.com) API.

There are several other weather-focused Pebble watchfaces that might look similar, but I found most of those *too* maximal for my needs. I wanted something focused just on the things that are most relevant to me over the next 24-hour period that I can grok at a glance.

## Features

- The current time, of course, with a large, high-contrast font.
- The current date and day of week.
- The current location and timezone.
- Current temperature and high/low for the day.
- 24-hour temperature graph with secondary apparent temperature line.
- 24-hour precipitation probability graph with cloud cover.
- Daylight indicator with sunrise and sunset times.
- Moon phase on the midnight indicator.
- Current weather condition icon.
- Battery level and charging status.
- Bluetooth disconnect indicator.
- Respects system 12/24-hour time format
- Temperature unit detection based on locale (defaults to Celsius, but Fahrenheit if you're in the US)

## To do

- [ ] Bluetooth disconnect vibration
- [ ] Quiet time indicator
- [ ] Support round watches (e.g. Pebble Round 2)
- [ ] Settings page for customizations
- [ ] Customize date format
- [ ] Customize battery indicator (e.g. show percentage instead of icon)
- [ ] Customize bluetooth indicator (e.g. show icon when connected)
- [ ] Customize color scheme (e.g. light mode, accent colors)
- [ ] Customize temperature unit

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

Build the watchface using the Pebble CLI:

```sh
pebble build
```

Then install it on the emulator of your choice:

```sh
# Pebble Time 2 (rectangular, 200×228)
pebble install --emulator emery --logs

# Pebble 2 Duo (rectangular, 144×168)
pebble install --emulator flint --logs
```

### Install on your device

If you want to be able to run the watchface on your device, you'll also want to log in with GitHub after installing the Pebble SDK:

```sh
pebble login
```

This will enable the `--cloudpebble` option:

```sh
pebble install --cloudpebble
```

### Project Structure

```
resources/      # Static assets (e.g. icon font)
scripts/        # Utility scripts (e.g. icon generation)
src/
  c/            # C code
    generated/  # Generated C code (e.g. from generated icons)
    modules/    # C modules (settings, weather, etc.)
    ui/         # Custom UI widget implementations (e.g. graph, event layer)
    main.c      # C entrypoint
  pkjs/
    index.js    # Phone-side weather & location data fetching
```

### Icons

This watchfaces uses icons from the [Carbon](https://carbondesignsystem.com/elements/icons/library/) icon set, which has the most exhaustive set of weather icons I could find. The name is a coincidence, I named the watchface Carbon before I found the icon set.

Icons are included as a custom font generated from [IcoMoon](https://icomoon.io/). The `src/embeddedjs/assets/icons.icomoon.json` file can be imported into IcoMoon to edit the icon set. When icons are added, removed, or rearranged, the font must be re-exported from IcoMoon (with font family set to "IcoMoon"), and both the TTF and the JSON selection file must be replaced.

Move the downloaded TTF font file to `resources/fonts/IcoMoon-Regular.ttf` (the `-Regular` suffix is important!) and the JSON selection file to `resources/fonts/icons.icomoon.json`, then regenerate the reference table:

```sh
npm run gen-icons
```

This will update `src/c/generated/icons.h` with the icon names and codepoints, which can be used in C code as `ICON_<NAME>` (e.g. `ICON_SUN`).

---

## License

[GPL-3.0](LICENSE)
