#!/usr/bin/env node
"use strict";

/**
 * Generates src/c/generated/icons.h — C #define constants for each icon
 * codepoint in the IcoMoon font, as UTF-8 string literals suitable for use
 * with graphics_draw_text() and text_layer_set_text().
 *
 * Run via: npm run gen-icons
 *
 * @author    Cory Hughart <cory@coryhughart.com>
 * @copyright 2026 Cory Hughart
 * @license   https://www.gnu.org/licenses/gpl-3.0.html GPL-3.0-or-later
 * @link      https://cr0ybot.com/project/pebble-watchface-carbon
 */

const { readFileSync, writeFileSync, mkdirSync } = require("fs");
const { join, dirname } = require("path");

const ROOT    = join(__dirname, "..");
const SRC     = join(ROOT, "resources/fonts/icons.icomoon.json");
const OUT_H   = join(ROOT, "src/c/generated/icons.h");

// Convert a Unicode codepoint to a C-compatible UTF-8 escaped string literal.
// All our icons are in the BMP range U+F001–U+F582, so 3-byte UTF-8 only.
function toUtf8Escape(cp) {
  if (cp < 0x80) {
    return `\\x${cp.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  if (cp < 0x800) {
    const b1 = 0xC0 | (cp >> 6);
    const b2 = 0x80 | (cp & 0x3F);
    return `\\x${b1.toString(16).toUpperCase()}\\x${b2.toString(16).toUpperCase()}`;
  }
  // 3-byte (covers U+0800–U+FFFF)
  const b1 = 0xE0 | (cp >> 12);
  const b2 = 0x80 | ((cp >> 6) & 0x3F);
  const b3 = 0x80 | (cp & 0x3F);
  return [b1, b2, b3]
    .map(b => `\\x${b.toString(16).toUpperCase()}`)
    .join("");
}

const { glyphs } = JSON.parse(readFileSync(SRC, "utf8"));

const defines = glyphs
  .map(g => {
    const name = (g.extras?.name || g.properties?.name || "unknown")
      .toUpperCase()
      .replace(/-/g, "_");
    const cp   = g.extras?.codePoint || g.properties?.code || 0;
    const hex  = cp.toString(16).toUpperCase().padStart(4, "0");
    const utf8 = toUtf8Escape(cp);
    return `#define ICON_${name.padEnd(28)} "${utf8}"  /* U+${hex} */`;
  })
  .join("\n");

const output = `\
// Auto-generated from src/embeddedjs/assets/icons.icomoon.json
// Run \`npm run gen-icons\` to regenerate after updating the icon set.
// DO NOT EDIT BY HAND.
#pragma once

${defines}
`;

mkdirSync(dirname(OUT_H), { recursive: true });
writeFileSync(OUT_H, output, "utf8");
console.log(`Generated ${glyphs.length} icon defines → src/c/generated/icons.h`);
