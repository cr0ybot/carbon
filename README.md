# Carbon

A feature-rich, highly configurable Pebble watchface for **Pebble Time 2** and **Pebble Round 2**, built with the [Alloy](https://developer.repebble.com/guides/alloy/) JavaScript framework.

Features a 24-hour precipitation probability graph, modular widget slots, configurable date/time formats, and live weather via the free [Open-Meteo](https://open-meteo.com) API.

Inspired by [Graphite](https://github.com/stefanheule/graphite) by Stefan Heule.

---

## Dev Environment Setup

### Prerequisites

- [Pebble SDK](https://developer.repebble.com/sdk/) (includes the `pebble` CLI tool)
- [Node.js](https://nodejs.org) (for PKJS dependencies)

If you want to be able to run the watchface on your device, you'll also want to log in with GitHub after installing the Pebble SDK:

```sh
pebble login
```

This will enable the `install` npm script.

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

```sh
npm run install
```

---

## Project Structure

```
src/
  embeddedjs/      # Watch-side JavaScript (runs on device)
    assets/        # Fonts, icons, and other resources
    main.ts        # Entry point
    widgets/       # Modular widget components
  pkjs/
    index.js       # Phone-side proxy + Clay settings init
    config.js      # Clay settings configuration
```

---

## License

[GPL-3.0](LICENSE)
