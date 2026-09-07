// src/ui/Title.jsx
import React, { useState } from "react";
function Title({ profile, onPlay, onArmory, onSkins, onSettings }) {
  const [help, setHelp] = useState(false);
  return /* @__PURE__ */ React.createElement("div", { className: "screen" }, /* @__PURE__ */ React.createElement("div", { className: "hero" }, /* @__PURE__ */ React.createElement("h1", null, "QYNGUN"), /* @__PURE__ */ React.createElement("p", null, "MOMENTUM IS DAMAGE"), /* @__PURE__ */ React.createElement("div", { className: "cta" }, /* @__PURE__ */ React.createElement("button", { className: "btn pri", style: { padding: "15px 34px", fontSize: 13 }, onClick: onPlay }, "\u25B6 ENTER LOBBY"), /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: onArmory }, "ARMORY"), /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: onSkins }, "SKINS"), /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: onSettings }, "SETTINGS"), /* @__PURE__ */ React.createElement("button", { className: "btn ghost", onClick: () => setHelp(!help) }, help ? "CLOSE" : "MOVEMENT GUIDE")), /* @__PURE__ */ React.createElement("div", { className: "keys" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, "WASD"), " MOVE"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, "SHIFT"), " SPRINT"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, "CTRL"), " SLIDE"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, "SPACE"), " JUMP"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, "RMB"), " AIM"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, "F"), " UTILITY")), help && /* @__PURE__ */ React.createElement("div", { className: "panel", style: { position: "static", marginTop: 34, maxWidth: 800, textAlign: "left", clipPath: "none" } }, /* @__PURE__ */ React.createElement("div", { className: "h" }, "THE CHAIN"), /* @__PURE__ */ React.createElement("div", { className: "hint", style: { fontSize: 12.5, lineHeight: 2 } }, /* @__PURE__ */ React.createElement("div", null, "SPRINT ", /* @__PURE__ */ React.createElement("span", { style: { color: "var(--cy)" } }, "\u2192"), " SLIDE ", /* @__PURE__ */ React.createElement("span", { style: { color: "var(--cy)" } }, "\u2192"), " JUMP", /* @__PURE__ */ React.createElement("span", { style: { color: "var(--cy)" } }, "\u2192"), " AIR STRAFE ", /* @__PURE__ */ React.createElement("span", { style: { color: "var(--cy)" } }, "\u2192"), " LAND", /* @__PURE__ */ React.createElement("span", { style: { color: "var(--cy)" } }, "\u2192"), " SLIDE"), /* @__PURE__ */ React.createElement("div", { style: { color: "var(--dim)" } }, "\u2022 Sliding while sprinting keeps every bit of your speed \u2014 the slide is momentum, not an animation.", /* @__PURE__ */ React.createElement("br", null), "\u2022 Jump out of a slide without losing horizontal velocity; hop early for a small bonus.", /* @__PURE__ */ React.createElement("br", null), "\u2022 In the air, ", /* @__PURE__ */ React.createElement("b", { style: { color: "var(--cy)" } }, "A"), "/", /* @__PURE__ */ React.createElement("b", { style: { color: "var(--cy)" } }, "D"), " plus a smooth mouse turn curves your path and ", /* @__PURE__ */ React.createElement("i", null, "gains"), " speed. Holding W does nothing up there.", /* @__PURE__ */ React.createElement("br", null), "\u2022 Downhill sprints and slides accelerate. Uphill bleeds. Slopes are never walls.", /* @__PURE__ */ React.createElement("br", null), "\u2022 Jump is buffered before landing and coyote-timed after leaving a ledge. Both are invisible.", /* @__PURE__ */ React.createElement("br", null), "\u2022 ", /* @__PURE__ */ React.createElement("b", { style: { color: "var(--or)" } }, "Damage scales with speed."), " A 15 m/s knife hit does double."))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 30, display: "flex", gap: 14 } }, /* @__PURE__ */ React.createElement("div", { className: "chip" }, /* @__PURE__ */ React.createElement("b", null, profile.qyns), " \u25C8 QYNS"), /* @__PURE__ */ React.createElement("div", { className: "chip" }, "LEVEL ", /* @__PURE__ */ React.createElement("b", null, profile.level)), /* @__PURE__ */ React.createElement("div", { className: "chip" }, profile.stats.kills, " ", /* @__PURE__ */ React.createElement("b", null, "KILLS")), /* @__PURE__ */ React.createElement("div", { className: "chip" }, "TOP ", /* @__PURE__ */ React.createElement("b", null, profile.stats.topSpeed || 0), " M/S"))));
}

// src/ui/Lobby.jsx
import React2, { useState as useState2 } from "react";

// src/game/data/maps.js
var PAL = {
  floor: 2634302,
  floorAlt: 3095368,
  wall: 3819351,
  wallDark: 2831683,
  plat: 4609639,
  platHigh: 5202548,
  ramp: 2911092,
  rampWarm: 8016688,
  trim: 16747069,
  neon: 7268351,
  violet: 10320895,
  stair: 4148316,
  cover: 5464431
};
var B = (cx, cy, cz, hx, hy, hz, rot = [0, 0, 0], color = PAL.wall, tag = "") => ({ center: [cx, cy, cz], half: [hx, hy, hz], rot, color, tag });
var slab = (x0, z0, x1, z1, y = 0, color = PAL.floor, tag = "floor") => B((x0 + x1) / 2, y - 1, (z0 + z1) / 2, (x1 - x0) / 2, 1, (z1 - z0) / 2, [0, 0, 0], color, tag);
var wall = (x0, z0, x1, z1, h, y = 0, t = 0.6, color = PAL.wall) => {
  const dx = x1 - x0, dz = z1 - z0;
  const len = Math.hypot(dx, dz) || 1;
  return B(
    (x0 + x1) / 2,
    y + h / 2,
    (z0 + z1) / 2,
    Math.abs(dx) > Math.abs(dz) ? len / 2 : t,
    h / 2,
    Math.abs(dx) > Math.abs(dz) ? t : len / 2,
    [0, 0, 0],
    color,
    "wall"
  );
};
var ramp = (x0, y0, z0, x1, y1, z1, w = 6, color = PAL.ramp, t = 0.4) => {
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  const L = Math.hypot(dx, dz);
  const slant = Math.hypot(L, dy);
  return B(
    (x0 + x1) / 2,
    (y0 + y1) / 2,
    (z0 + z1) / 2,
    w / 2,
    t,
    slant / 2,
    [-Math.atan2(dy, L), Math.atan2(dx, dz), 0],
    color,
    "ramp"
  );
};
var stairs = (x, y, z, dx, dz, n, rise = 0.25, run = 0.5, w = 4, color = PAL.stair) => {
  const out = [];
  const l = Math.hypot(dx, dz);
  const ux = dx / l, uz = dz / l;
  for (let i = 0; i < n; i++) {
    const cx = x + ux * (i + 0.5) * run;
    const cz = z + uz * (i + 0.5) * run;
    const h = (i + 1) * rise;
    out.push(B(
      cx,
      y + h / 2,
      cz,
      Math.abs(ux) > 0.5 ? run / 2 : w / 2,
      h / 2,
      Math.abs(uz) > 0.5 ? run / 2 : w / 2,
      [0, 0, 0],
      color,
      "stair"
    ));
  }
  return out;
};
function qynYard() {
  const b = [];
  b.push(slab(-60, -60, 60, -12, 0, PAL.floor));
  b.push(slab(-60, -12, -30, 60, 0, PAL.floorAlt));
  b.push(slab(30, -12, 60, 60, 0, PAL.floorAlt));
  b.push(slab(-24, -6, 24, 18, 0, PAL.floor));
  b.push(slab(-24, 24, 24, 60, 0, PAL.floor));
  b.push(slab(-30, 54, 30, 60, 0, PAL.floorAlt));
  b.push(slab(-30, 24, -24, 54, 0, PAL.floor));
  b.push(slab(24, 24, 30, 54, 0, PAL.floor));
  const H = 16;
  b.push(wall(-60, -60, 60, -60, H, 0, 1.5, PAL.wallDark));
  b.push(wall(-60, 60, 60, 60, H, 0, 1.5, PAL.wallDark));
  b.push(wall(-60, -60, -60, 60, H, 0, 1.5, PAL.wallDark));
  b.push(wall(60, -60, 60, 60, H, 0, 1.5, PAL.wallDark));
  b.push(B(-46, 4.4, -40, 9, 0.4, 9, [0, 0, 0], PAL.plat));
  b.push(ramp(-33, 0, -40, -40, 8.8, -40, 9, PAL.ramp));
  b.push(wall(-55, -49, -37, -49, 3, 8.8, 0.5, PAL.wall));
  b.push(wall(-55, -31, -37, -31, 3, 8.8, 0.5, PAL.wall));
  b.push(ramp(-40, 8.8, -31, -20, 0, -31, 10, PAL.rampWarm));
  b.push(wall(-45, -36, -45, -26, 2, 0, 0.5, PAL.trim));
  b.push(wall(-15, -36, -15, -26, 2, 0, 0.5, PAL.trim));
  b.push(B(46, 6.4, 20, 8, 0.4, 10, [0, 0, 0], PAL.plat));
  b.push(ramp(38, 12, 20, 22, 0, 20, 8, PAL.rampWarm));
  b.push(wall(46, 10, 46, 30, 3, 12, 0.5, PAL.wall));
  b.push(...stairs(50, 0, 34, 0, -1, 20, 0.3, 0.5, 4));
  b.push(...stairs(10, 0, 12, -1, 0, 12, 0.3, 0.55, 5));
  b.push(B(-2, 1.8, 12, 8, 0.2, 2.5, [0, 0, 0], PAL.platHigh));
  const chain = [[-14, -22, 1.2], [-6, -26, 2.6], [2, -30, 4], [10, -26, 5.4], [18, -22, 6.8]];
  for (const [x, z, y] of chain) b.push(B(x, y / 2, z, 2.2, y / 2, 2.2, [0, 0, 0], PAL.plat));
  b.push(B(24, 4.4, -18, 3, 0.3, 6, [0, 0, 0], PAL.platHigh));
  b.push(B(0, 3, 40, 16, 0.3, 3, [0, 0, 0], PAL.plat));
  b.push(ramp(-16, 0, 36, -16, 6, 36, 4, PAL.ramp));
  b.push(ramp(16, 0, 36, 16, 6, 36, 4, PAL.ramp));
  b.push(wall(-14, 43, 14, 43, 2.4, 0, 0.5, PAL.cover));
  b.push(wall(14, 37, 14, 49, 2.4, 0, 0.5, PAL.cover));
  b.push(wall(-14, 37, -14, 49, 2.4, 0, 0.5, PAL.cover));
  b.push(B(-18, 1.1, -34, 3, 1.1, 1.2, [0, 0, 0], PAL.cover));
  b.push(B(18, 1.1, -34, 3, 1.1, 1.2, [0, 0, 0], PAL.cover));
  b.push(B(0, 1.6, -46, 5, 1.6, 1.2, [0, 0, 0], PAL.cover));
  b.push(wall(-30, -46, -30, -34, 3, 0, 0.6, PAL.wall));
  b.push(wall(-30, -46, -18, -46, 3, 0, 0.6, PAL.wall));
  b.push(wall(30, -46, 30, -34, 3, 0, 0.6, PAL.wall));
  b.push(wall(30, -46, 18, -46, 3, 0, 0.6, PAL.wall));
  for (let i = 0; i < 5; i++) b.push(B(-10 + i * 1.2, 0.15 + i * 0.15, 8, 0.6, 0.15 + i * 0.15, 3, [0, 0, 0], PAL.stair));
  b.push(ramp(-50, 0, 0, -44, 3.2, 0, 6, PAL.ramp));
  b.push(ramp(-44, 3.2, 0, -38, 0, 0, 6, PAL.ramp));
  b.push(ramp(50, 0, -6, 44, 3.2, -6, 6, PAL.ramp));
  b.push(ramp(44, 3.2, -6, 38, 0, -6, 6, PAL.ramp));
  b.push(B(0, -0.15, -9, 4, 0.15, 3.2, [0, 0, 0], PAL.platHigh));
  b.push(B(0, -0.15, 21, 4, 0.15, 3.2, [0, 0, 0], PAL.platHigh));
  b.push(B(-27, -0.15, 6, 3.2, 0.15, 4, [0, 0, 0], PAL.platHigh));
  b.push(B(27, -0.15, 6, 3.2, 0.15, 4, [0, 0, 0], PAL.platHigh));
  return b;
}
function vertex() {
  const b = [];
  b.push(slab(-34, -34, 34, 34, 0, PAL.floor));
  const H = 14;
  b.push(wall(-34, -34, 34, -34, H), wall(-34, 34, 34, 34, H), wall(-34, -34, -34, 34, H), wall(34, -34, 34, 34, H));
  b.push(B(0, 2.6, 0, 5, 2.6, 5, [0, 0, 0], PAL.plat));
  b.push(B(0, 5.4, 0, 3.4, 0.3, 3.4, [0, 0, 0], PAL.platHigh));
  b.push(ramp(-9, 0, 0, -5, 5.2, 0, 5, PAL.ramp));
  b.push(ramp(9, 0, 0, 5, 5.2, 0, 5, PAL.ramp));
  b.push(ramp(0, 0, -9, 0, 5.2, -5, 5, PAL.ramp));
  b.push(ramp(0, 0, 9, 0, 5.2, 5, 5, PAL.ramp));
  b.push(B(-22, 1.6, 0, 3, 1.6, 12, [0, 0, 0], PAL.plat));
  b.push(B(22, 1.6, 0, 3, 1.6, 12, [0, 0, 0], PAL.plat));
  b.push(ramp(-22, 0, 14, -22, 3.2, 20, 4, PAL.ramp));
  b.push(ramp(22, 0, -14, 22, 3.2, -20, 4, PAL.ramp));
  for (const [x, z] of [[-14, -14], [14, -14], [-14, 14], [14, 14], [-14, 0], [14, 0]]) {
    b.push(B(x, 1.1, z, 1.8, 1.1, 1.8, [0, 0, 0], PAL.cover));
  }
  b.push(wall(-30, -20, -30, -8, 3), wall(30, 8, 30, 20, 3));
  b.push(wall(-20, -30, -8, -30, 3), wall(8, 30, 20, 30, 3));
  b.push(...stairs(-30, 0, 26, 1, 0, 10, 0.3, 0.5, 4));
  b.push(...stairs(30, 0, -26, -1, 0, 10, 0.3, 0.5, 4));
  return b;
}
function conduit() {
  const b = [];
  b.push(slab(-46, -46, 46, 46, 0, PAL.floor));
  const H = 15;
  b.push(wall(-46, -46, 46, -46, H), wall(-46, 46, 46, 46, H), wall(-46, -46, -46, 46, H), wall(46, -46, 46, 46, H));
  b.push(B(0, 2.2, 0, 9, 2.2, 7, [0, 0, 0], PAL.plat));
  b.push(B(0, 4.7, 0, 7, 0.3, 5, [0, 0, 0], PAL.platHigh));
  b.push(ramp(-14, 0, 0, -9, 4.4, 0, 6, PAL.ramp));
  b.push(ramp(14, 0, 0, 9, 4.4, 0, 6, PAL.ramp));
  b.push(B(0, 5, -7.5, 7, 0.3, 2, [0, 0, 0], PAL.platHigh));
  b.push(B(0, 1.5, -26, 22, 1.5, 3, [0, 0, 0], PAL.plat));
  b.push(B(0, 1.5, 26, 22, 1.5, 3, [0, 0, 0], PAL.plat));
  b.push(ramp(-24, 0, -26, -24, 3, -32, 4, PAL.ramp));
  b.push(ramp(24, 0, 26, 24, 3, 32, 4, PAL.ramp));
  for (const sx of [-1, 1]) {
    b.push(B(sx * 34, 3, sx * 20, 6, 3, 6, [0, 0, 0], PAL.plat));
    b.push(B(sx * 34, 6.3, sx * 20, 5, 0.3, 5, [0, 0, 0], PAL.platHigh));
    b.push(ramp(sx * 34, 0, sx * 32, sx * 34, 6, sx * 26, 5, PAL.ramp));
    b.push(wall(sx * 28, sx * 14, sx * 40, sx * 14, 3));
    b.push(wall(sx * 28, sx * 14, sx * 28, sx * 26, 3));
  }
  for (const [x, z] of [[-12, -14], [12, -14], [-12, 14], [12, 14], [-22, 0], [22, 0], [0, -30], [0, 30]]) {
    b.push(B(x, 1.2, z, 2, 1.2, 2, [0, 0, 0], PAL.cover));
  }
  b.push(...stairs(-40, 0, -8, 0, 1, 12, 0.3, 0.5, 4));
  b.push(...stairs(40, 0, 8, 0, -1, 12, 0.3, 0.5, 4));
  return b;
}
function descent() {
  const b = [];
  b.push(slab(-50, -50, 50, 50, 0, PAL.floor));
  const H = 18;
  b.push(wall(-50, -50, 50, -50, H), wall(-50, 50, 50, 50, H), wall(-50, -50, -50, 50, H), wall(50, -50, 50, 50, H));
  b.push(B(-38, 11, 0, 12, 11, 14, [0, 0, 0], PAL.plat));
  b.push(B(-24, 6.5, 0, 8, 6.5, 14, [0, 0, 0], PAL.plat));
  b.push(B(-12, 3.2, 0, 7, 3.2, 14, [0, 0, 0], PAL.plat));
  b.push(ramp(-26, 22, -12, -2, 0, -12, 9, PAL.rampWarm));
  b.push(ramp(-26, 22, 12, -2, 0, 12, 9, PAL.rampWarm));
  b.push(B(-38, 11.4, 0, 12, 0.4, 14, [0, 0, 0], PAL.platHigh));
  b.push(wall(-50, -14, -26, -14, 4, 22.8, 0.5, PAL.wall));
  b.push(wall(-50, 14, -26, 14, 4, 22.8, 0.5, PAL.wall));
  b.push(B(14, 4.4, 0, 9, 0.4, 14, [0, 0, 0], PAL.plat));
  b.push(B(28, 2.2, 0, 8, 0.4, 14, [0, 0, 0], PAL.plat));
  b.push(B(40, 0.9, 0, 7, 0.4, 14, [0, 0, 0], PAL.plat));
  b.push(ramp(4, 0, -20, 10, 4.4, -20, 5, PAL.ramp));
  b.push(ramp(4, 0, 20, 10, 4.4, 20, 5, PAL.ramp));
  b.push(...stairs(20, 0, -24, 0, -1, 14, 0.3, 0.5, 4));
  b.push(...stairs(20, 4.4, -30, -1, 0, 16, 0.3, 0.5, 4));
  b.push(...stairs(-30, 0, 30, 0, 1, 16, 0.3, 0.5, 5));
  b.push(ramp(6, 0, 34, 20, 5.2, 34, 8, PAL.ramp));
  b.push(ramp(20, 5.2, 34, 34, 0, 34, 8, PAL.ramp));
  b.push(wall(10, 40, 30, 40, 3), wall(10, 28, 10, 40, 3));
  return b;
}
function range() {
  const b = [];
  b.push(slab(-40, -40, 40, 40, 0, PAL.floor));
  const H = 12;
  b.push(wall(-40, -40, 40, -40, H), wall(-40, 40, 40, 40, H), wall(-40, -40, -40, 40, H), wall(40, -40, 40, 40, H));
  b.push(B(0, 0.2, 30, 30, 0.2, 3, [0, 0, 0], PAL.plat));
  for (const d of [10, 20, 30, 40, 55]) {
    b.push(B(-14, 0.15, 30 - d, 0.12, 0.15, 6, [0, 0, 0], PAL.trim));
    b.push(B(14, 0.15, 30 - d, 0.12, 0.15, 6, [0, 0, 0], PAL.trim));
  }
  b.push(B(0, 4, -27, 36, 4, 0.6, [0, 0, 0], PAL.wall));
  b.push(B(0, 5, -26.2, 30, 5, 0.08, [0, 0, 0], PAL.trim));
  for (const [x, z] of [[-24, 22], [24, 22], [-24, 4], [24, 4], [-24, -12], [24, -12]]) {
    b.push(B(x, 1.1, z, 2.6, 1.1, 2.6, [0, 0, 0], PAL.cover));
  }
  b.push(B(-26, 0.05, 0, 11, 0.05, 36, [0, 0, 0], PAL.floorAlt));
  b.push(ramp(-26, 0, 34, -26, 5.4, 22, 6, PAL.ramp));
  b.push(B(-26, 2.9, 18, 6, 0.3, 6, [0, 0, 0], PAL.platHigh));
  b.push(ramp(-26, 6, 12, -26, 0, -2, 6, PAL.rampWarm));
  b.push(...stairs(-26, 0, -14, 0, 1, 12, 0.3, 0.5, 5));
  b.push(B(-26, 1.9, -20, 6, 0.2, 4, [0, 0, 0], PAL.platHigh));
  b.push(wall(-37, -36, -37, 36, 1.2, 0, 0.4, PAL.trim));
  b.push(wall(-15, -36, -15, 36, 1.2, 0, 0.4, PAL.trim));
  b.push(B(26, 2.2, 0, 8, 0.3, 8, [0, 0, 0], PAL.plat));
  b.push(ramp(18, 0, 0, 20, 4.4, 0, 5, PAL.ramp));
  b.push(ramp(34, 0, 0, 32, 4.4, 0, 5, PAL.ramp));
  for (let i = 0; i < 5; i++) b.push(B(20 + i * 3, 0.8 + i * 0.8, 14 - i * 2, 1.4, 0.8 + i * 0.8, 1.4, [0, 0, 0], PAL.plat));
  return b;
}
function fracture() {
  const b = [];
  b.push(slab(-44, -44, 44, 44, 0, PAL.floor));
  const H = 14;
  b.push(wall(-44, -44, 44, -44, H), wall(-44, 44, 44, 44, H), wall(-44, -44, -44, 44, H), wall(44, -44, 44, 44, H));
  b.push(B(-20, 4.2, -20, 24, 0.35, 16, [0, 0, 0], PAL.plat));
  b.push(wall(-44, -36, 4, -36, 1.1, 4.2, 0.5, PAL.trim));
  b.push(wall(-44, -4, 4, -4, 1.1, 4.2, 0.5, PAL.trim));
  b.push(wall(4, -36, 4, -20, 1.1, 4.2, 0.5, PAL.trim));
  for (const [x, z] of [[-30, -28], [-10, -12], [0, -30], [-24, -8]]) {
    b.push(B(x, 5.7, z, 2.4, 1.5, 2.4, [0, 0, 0], PAL.cover));
  }
  b.push(ramp(-42, 0, 6, -34, 4.5, -2, 7, PAL.ramp));
  b.push(...stairs(2, 0, 2, 0, -1, 18, 0.25, 0.5, 5));
  b.push(ramp(-6, 4.5, -6, 6, 4.5, -6, 6, PAL.rampWarm));
  b.push(B(0, 1.6, 16, 12, 1.6, 8, [0, 0, 0], PAL.platHigh));
  b.push(ramp(-12, 1.6, 24, -12, 0, 34, 6, PAL.rampWarm));
  b.push(ramp(12, 1.6, 24, 12, 0, 34, 6, PAL.rampWarm));
  b.push(B(-26, 0.9, 26, 7, 0.9, 7, [0, 0, 0], PAL.plat));
  b.push(B(26, 0.9, 26, 7, 0.9, 7, [0, 0, 0], PAL.plat));
  b.push(B(-14, 2.6, 2, 3, 0.3, 3, [0, 0, 0], PAL.platHigh));
  b.push(B(14, 2.6, 2, 3, 0.3, 3, [0, 0, 0], PAL.platHigh));
  b.push(B(0, 3.6, -2, 5, 0.3, 5, [0, 0, 0], PAL.platHigh));
  b.push(ramp(0, 3.9, 3, 0, 1.6, 8, 5, PAL.ramp));
  for (const [x, z] of [[-18, 12], [18, 12], [-6, 30], [8, 30], [0, 20]]) {
    b.push(B(x, 0.9, z, 1.8, 0.9, 1.8, [0, 0, 0], PAL.cover));
  }
  b.push(B(-34, 3, 34, 5, 3, 5, [0, 0, 0], PAL.wall));
  b.push(B(34, 3, 34, 5, 3, 5, [0, 0, 0], PAL.wall));
  b.push(ramp(-29, 3, 34, -22, 0, 34, 5, PAL.ramp));
  b.push(ramp(29, 3, 34, 22, 0, 34, 5, PAL.ramp));
  b.push(B(-8, 0.1, 38, 10, 0.1, 5, [0, 0, 0], PAL.floorAlt));
  return b;
}
var MAPS = [
  {
    id: "yard",
    name: "QYN YARD",
    sub: "MOVEMENT PLAYGROUND",
    desc: "Flat ground, ramps, stairs, gaps, long platforms, walls, corners. Built for chains.",
    sky: [725014, 1714744],
    fog: 1450542,
    fogNear: 60,
    fogFar: 190,
    brushes: qynYard(),
    spawns: {
      a: [[0, 0.2, -44, 0], [-24, 0.2, -26, 0.4], [24, 0.2, -26, -0.4], [-10, 0.2, -50, 0.2]],
      b: [[0, 0.2, 30, Math.PI], [-18, 0.2, 48, Math.PI + 0.4], [18, 0.2, 48, Math.PI - 0.4], [0, 0.2, 52, Math.PI]]
    },
    bots: true,
    killY: -25,
    modes: ["1v1", "2v2", "3v3", "bots"]
  },
  {
    id: "vertex",
    name: "VERTEX",
    sub: "DUEL ARENA",
    desc: "Tight and symmetrical. Centre tower, four ramps, instant fights.",
    sky: [856088, 2366771],
    fog: 1776684,
    fogNear: 45,
    fogFar: 150,
    brushes: vertex(),
    spawns: {
      a: [[0, 0.2, -26, 0], [-16, 0.2, -22, 0.3], [16, 0.2, -22, -0.3], [0, 0.2, -18, 0]],
      b: [[0, 0.2, 26, Math.PI], [16, 0.2, 22, Math.PI - 0.3], [-16, 0.2, 22, Math.PI + 0.3], [0, 0.2, 18, Math.PI]]
    },
    bots: true,
    killY: -25,
    modes: ["1v1", "2v2", "bots"]
  },
  {
    id: "conduit",
    name: "CONDUIT",
    sub: "THREE LANES",
    desc: "Mid deck, side towers, long lanes. Space to rotate and flank.",
    sky: [660504, 1192e3],
    fog: 1188396,
    fogNear: 55,
    fogFar: 175,
    brushes: conduit(),
    spawns: {
      a: [[0, 0.2, -36, 0], [-20, 0.2, -32, 0.3], [20, 0.2, -32, -0.3], [-8, 0.2, -38, 0], [8, 0.2, -38, 0]],
      b: [[0, 0.2, 36, Math.PI], [20, 0.2, 32, Math.PI - 0.3], [-20, 0.2, 32, Math.PI + 0.3], [-8, 0.2, 38, Math.PI], [8, 0.2, 38, Math.PI]]
    },
    bots: true,
    killY: -25,
    modes: ["2v2", "3v3", "bots"]
  },
  {
    id: "descent",
    name: "DESCENT",
    sub: "THE HILL",
    desc: "Summit to bowl. Sprint down, slide the whole way, learn to carry speed.",
    sky: [1314572, 3810328],
    fog: 2365972,
    fogNear: 60,
    fogFar: 210,
    brushes: descent(),
    spawns: {
      a: [[-38, 23, 0, Math.PI / 2], [-38, 23, -8, Math.PI / 2], [-38, 23, 8, Math.PI / 2]],
      b: [[36, 1.5, 0, -Math.PI / 2], [36, 1.5, -8, -Math.PI / 2], [36, 1.5, 8, -Math.PI / 2], [24, 3, 0, -Math.PI / 2]]
    },
    bots: true,
    killY: -25,
    modes: ["1v1", "2v2", "3v3", "bots"]
  },
  {
    id: "fracture",
    name: "FRACTURE",
    sub: "SPLIT LEVEL",
    desc: "Upper deck over a bowl. Drop, slide the downhill, come back up the long ramp.",
    sky: [921878, 2374468],
    fog: 1516588,
    fogNear: 55,
    fogFar: 180,
    brushes: fracture(),
    spawns: {
      a: [[-30, 4.6, -28, 0.6], [-8, 4.6, -30, 0.2], [-28, 4.6, -10, 0.9], [-14, 4.6, -16, 0.4]],
      b: [[0, 0.2, 38, Math.PI], [-20, 0.2, 38, Math.PI + 0.3], [20, 0.2, 38, Math.PI - 0.3], [-4, 0.2, 30, Math.PI]]
    },
    bots: true,
    killY: -25,
    modes: ["1v1", "2v2", "3v3", "bots"]
  },
  {
    id: "range",
    name: "QYN RANGE",
    sub: "TRAINING",
    desc: "Every loadout, every distance, plus a speed track to test your chains.",
    sky: [790548, 1779507],
    fog: 1318182,
    fogNear: 50,
    fogFar: 170,
    brushes: range(),
    spawns: { a: [[0, 0.6, 30, 0], [-8, 0.6, 30, 0], [8, 0.6, 30, 0]], b: [[0, 0.6, -22, Math.PI]] },
    bots: false,
    killY: -25,
    modes: ["range"]
  }
];
var MAP_BY_ID = Object.fromEntries(MAPS.map((m) => [m.id, m]));
var MODES = [
  { id: "1v1", name: "1 v 1", teamA: 1, teamB: 1, bots: 0, desc: "Pure duel. No excuses." },
  { id: "2v2", name: "2 v 2", teamA: 2, teamB: 2, bots: 0, desc: "Two on two. Cover your mate." },
  { id: "3v3", name: "3 v 3", teamA: 3, teamB: 3, bots: 0, desc: "Full squad skirmish." },
  { id: "solo_bots", name: "1 v BOTS", teamA: 1, teamB: 1, bots: 1, desc: "You against one bot. Warm up." },
  { id: "duo_bots", name: "1 + BOT v 2 BOTS", teamA: 2, teamB: 2, bots: 3, desc: "You and a bot versus two." },
  { id: "trio_bots", name: "1 + 2 BOTS v 3 BOTS", teamA: 3, teamB: 3, bots: 5, desc: "Full lobby, five bots." },
  { id: "range", name: "SHOOTING RANGE", teamA: 1, teamB: 0, bots: 0, desc: "Try every loadout. No pressure." },
  { id: "p2p", name: "ONLINE DUEL", teamA: 1, teamB: 0, bots: 0, desc: "Peer to peer. You and one other player, no server." }
];

// src/ui/Lobby.jsx
function Lobby({ profile, onQueue, onOnline, onBack }) {
  const [modeId, setModeId] = useState2("1v1");
  const [mapId, setMapId] = useState2("yard");
  const [bots, setBots] = useState2(profile.settings.botLevel || "normal");
  const mode = MODES.find((m) => m.id === modeId);
  const map = MAPS.find((m) => m.id === mapId);
  const eligible = MAPS.filter((m) => m.modes.includes(modeId === "range" ? "range" : mode.bots > 0 || mode.teamA >= 3 ? "3v3" : mode.teamA >= 2 ? "2v2" : "1v1"));
  return /* @__PURE__ */ React2.createElement("div", { className: "screen" }, /* @__PURE__ */ React2.createElement("div", { className: "topbar" }, /* @__PURE__ */ React2.createElement("div", { className: "logo" }, "QynGun", /* @__PURE__ */ React2.createElement("small", null, "LOBBY")), /* @__PURE__ */ React2.createElement("div", { className: "wallet" }, /* @__PURE__ */ React2.createElement("div", { className: "chip" }, /* @__PURE__ */ React2.createElement("b", null, profile.qyns), " \u25C8 QYNS"), /* @__PURE__ */ React2.createElement("button", { className: "btn sm ghost", onClick: onBack }, "\u25C0 MENU"))), /* @__PURE__ */ React2.createElement("div", { className: "content" }, /* @__PURE__ */ React2.createElement("div", { className: "h" }, "GAME MODE"), /* @__PURE__ */ React2.createElement("div", { className: "grid", style: { gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))" } }, MODES.map((m) => /* @__PURE__ */ React2.createElement("div", { key: m.id, className: `card ${modeId === m.id ? "on" : ""}`, onClick: () => {
    setModeId(m.id);
    if (m.id === "range") setMapId("range");
    else if (mapId === "range" || !MAPS.find((x) => x.id === mapId)?.modes.includes(m.id === "range" ? "range" : "1v1")) setMapId("yard");
  } }, /* @__PURE__ */ React2.createElement("div", { className: "nm" }, m.name), /* @__PURE__ */ React2.createElement("div", { className: "ds" }, m.desc), /* @__PURE__ */ React2.createElement("div", { className: "mt" }, /* @__PURE__ */ React2.createElement("span", null, m.bots > 0 ? `${m.bots} BOTS` : "PVP"), /* @__PURE__ */ React2.createElement("span", { style: { color: "var(--cy)" } }, m.teamA, "v", m.teamB))))), modeId !== "range" && /* @__PURE__ */ React2.createElement(React2.Fragment, null, /* @__PURE__ */ React2.createElement("div", { className: "h", style: { marginTop: 26 } }, "MAP"), /* @__PURE__ */ React2.createElement("div", { className: "grid", style: { gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))" } }, MAPS.filter((m) => m.modes.includes("1v1") || m.modes.includes("2v2")).map((m) => /* @__PURE__ */ React2.createElement("div", { key: m.id, className: `card ${mapId === m.id ? "on" : ""}`, onClick: () => setMapId(m.id) }, /* @__PURE__ */ React2.createElement("div", { className: "nm" }, m.name, " ", /* @__PURE__ */ React2.createElement("span", { style: { color: "var(--dim)", fontSize: 10 } }, m.sub)), /* @__PURE__ */ React2.createElement("div", { className: "ds" }, m.desc), /* @__PURE__ */ React2.createElement("div", { className: "mt" }, /* @__PURE__ */ React2.createElement("span", null, m.brushes.length, " BRUSHES"), /* @__PURE__ */ React2.createElement("span", { style: { color: "var(--cy)" } }, "SELECT"))))), /* @__PURE__ */ React2.createElement("div", { className: "h", style: { marginTop: 26 } }, "BOT DIFFICULTY"), /* @__PURE__ */ React2.createElement("div", { className: "row" }, ["easy", "normal", "hard", "qyn"].map((d) => /* @__PURE__ */ React2.createElement("button", { key: d, className: `btn sm ${bots === d ? "pri" : "ghost"}`, onClick: () => setBots(d) }, d.toUpperCase())))), /* @__PURE__ */ React2.createElement("div", { style: { marginTop: 34, display: "flex", gap: 14, alignItems: "center" } }, /* @__PURE__ */ React2.createElement("button", { className: "btn pri", style: { padding: "15px 40px", fontSize: 13 }, onClick: () => onQueue({ modeId, mapId, bots }) }, modeId === "range" ? "ENTER RANGE \u25B6" : "QUEUE \u25B6"), /* @__PURE__ */ React2.createElement("div", { className: "hint" }, modeId === "range" ? "Free roam. Every weapon unlocked to try. Dummies respawn forever." : `${mode.name} on ${map?.name} \xB7 first to 5 rounds \xB7 150 HP \xB7 instant reset.`)), /* @__PURE__ */ React2.createElement("div", { style: { marginTop: 16, display: "flex", gap: 14, alignItems: "center" } }, /* @__PURE__ */ React2.createElement("button", { className: "btn", style: { padding: "13px 28px", fontSize: 12 }, onClick: onOnline }, "ONLINE DUEL \u25B6"), /* @__PURE__ */ React2.createElement("div", { className: "hint" }, "Real 1 v 1 over WebRTC. You and a friend swap two codes \u2014 no server, no account."))));
}

// src/ui/Armory.jsx
import React3, { useState as useState3 } from "react";

// src/game/data/weapons.js
var SLOTS = [
  { id: "primary", name: "PRIMARY", hint: "Your main damage tool." },
  { id: "secondary", name: "SECONDARY", hint: "Fast swap finisher." },
  { id: "melee", name: "MELEE", hint: "Speed scales its damage the hardest." },
  { id: "utility", name: "UTILITY", hint: "One per round. Use it well." }
];
var P = (id, name, qyn, rarity, desc, stats, model) => ({ id, slot: "primary", name, qyn, rarity, desc, stats, model });
var S = (id, name, qyn, rarity, desc, stats, model) => ({ id, slot: "secondary", name, qyn, rarity, desc, stats, model });
var M = (id, name, qyn, rarity, desc, stats, model) => ({ id, slot: "melee", name, qyn, rarity, desc, stats, model });
var U = (id, name, qyn, rarity, desc, stats, model) => ({ id, slot: "utility", name, qyn, rarity, desc, stats, model });
var WEAPONS = [
  // ══════════════════════════ PRIMARIES ══════════════════════════
  P(
    "vex9",
    "VEX-9",
    0,
    "standard",
    "Perfectly boring, perfectly reliable. The yardstick every other rifle is measured against.",
    { dmg: 21, head: 1.9, rpm: 660, auto: true, mag: 30, reserve: 120, reload: 1.9, spreadHip: 2.2, spreadAds: 0.32, adsTime: 0.22, adsFov: 62, range: 90, falloff: [45, 85, 0.65], recoil: { v: 0.85, h: 0.32, kick: 0.035, recover: 8 }, speed: 1, type: "hitscan" },
    { kind: "rifle", len: 0.72, body: 3094855, accent: 7268351, barrel: 0.3, stock: true, sight: "holo" }
  ),
  P(
    "krill",
    "KRILL-7",
    420,
    "standard",
    "Short, light and obnoxiously fast. Melts at knife range, runs dry in a heartbeat.",
    { dmg: 15, head: 1.7, rpm: 1050, auto: true, mag: 34, reserve: 136, reload: 1.7, spreadHip: 2.8, spreadAds: 0.55, adsTime: 0.16, adsFov: 70, range: 55, falloff: [20, 50, 0.5], recoil: { v: 0.62, h: 0.42, kick: 0.028, recover: 9 }, speed: 1.06, type: "hitscan" },
    { kind: "smg", len: 0.5, body: 3355199, accent: 16747069, barrel: 0.16, stock: false, sight: "dot" }
  ),
  P(
    "halberd",
    "HALBERD",
    700,
    "standard",
    "Three round burst. Rewards a steady trigger finger and a still crosshair.",
    { dmg: 26, head: 2, rpm: 760, auto: false, burst: 3, burstDelay: 0.28, mag: 24, reserve: 96, reload: 2, spreadHip: 2.4, spreadAds: 0.12, adsTime: 0.24, adsFov: 55, range: 120, falloff: [70, 120, 0.8], recoil: { v: 1.05, h: 0.22, kick: 0.045, recover: 7 }, speed: 0.98, type: "hitscan" },
    { kind: "rifle", len: 0.78, body: 3813162, accent: 16765286, barrel: 0.34, stock: true, sight: "holo" }
  ),
  P(
    "tremor",
    "TREMOR-44",
    1100,
    "rare",
    "Belt fed patience. Two hundred reasons to hold a corridor.",
    { dmg: 24, head: 1.6, rpm: 560, auto: true, mag: 75, reserve: 150, reload: 3.6, spreadHip: 4, spreadAds: 0.7, adsTime: 0.42, adsFov: 60, range: 100, falloff: [55, 100, 0.7], recoil: { v: 0.78, h: 0.5, kick: 0.05, recover: 5.5 }, speed: 0.9, type: "hitscan", spin: 0.25 },
    { kind: "lmg", len: 0.92, body: 2830136, accent: 10320895, barrel: 0.44, stock: true, sight: "holo", drum: true }
  ),
  P(
    "longspur",
    "LONGSPUR",
    1600,
    "rare",
    "Semi auto marksman rifle. Two to the chest, one to the head, no argument.",
    { dmg: 58, head: 2.2, rpm: 300, auto: false, mag: 12, reserve: 48, reload: 2.3, spreadHip: 4.5, spreadAds: 0.05, adsTime: 0.3, adsFov: 38, range: 160, falloff: [110, 160, 0.85], recoil: { v: 1.9, h: 0.2, kick: 0.09, recover: 5 }, speed: 0.95, type: "hitscan" },
    { kind: "dmr", len: 0.95, body: 2507082, accent: 7268351, barrel: 0.5, stock: true, sight: "scope" }
  ),
  P(
    "blackwing",
    "BLACKWING",
    2600,
    "epic",
    "Bolt action. Two bodyshots, or one at full sprint. Headshots at any speed.",
    { dmg: 112, head: 2, rpm: 48, auto: false, mag: 5, reserve: 25, reload: 3.1, spreadHip: 7, spreadAds: 0, adsTime: 0.42, adsFov: 22, range: 220, falloff: [180, 220, 0.95], recoil: { v: 3, h: 0.3, kick: 0.16, recover: 3.4 }, speed: 0.88, type: "hitscan", bolt: true },
    { kind: "sniper", len: 1.15, body: 1908775, accent: 16731501, barrel: 0.62, stock: true, sight: "scope" }
  ),
  P(
    "shatter",
    "SHATTER-12",
    1400,
    "rare",
    "Full auto shotgun. Slide around a corner, hold the trigger, delete the room.",
    { dmg: 11, head: 1.35, rpm: 190, auto: true, pellets: 8, mag: 8, reserve: 32, reload: 2.6, spreadHip: 5.5, spreadAds: 3.2, adsTime: 0.3, adsFov: 68, range: 28, falloff: [8, 26, 0.28], recoil: { v: 1.6, h: 0.6, kick: 0.11, recover: 6 }, speed: 1, type: "hitscan" },
    { kind: "shotgun", len: 0.66, body: 4008994, accent: 16752970, barrel: 0.34, stock: false, sight: "dot" }
  ),
  P(
    "wraith",
    "WRAITH-S",
    1900,
    "epic",
    "Integrally suppressed. No tracers, no muzzle flash, no sympathy.",
    { dmg: 19, head: 2, rpm: 800, auto: true, mag: 28, reserve: 112, reload: 1.8, spreadHip: 2, spreadAds: 0.28, adsTime: 0.19, adsFov: 64, range: 80, falloff: [40, 80, 0.6], recoil: { v: 0.7, h: 0.28, kick: 0.03, recover: 8.5 }, speed: 1.04, type: "hitscan", silent: true },
    { kind: "smg", len: 0.62, body: 1842724, accent: 3791242, barrel: 0.3, stock: true, sight: "dot" }
  ),
  P(
    "prismc",
    "PRISM CANNON",
    3400,
    "legendary",
    "Charged particle lance. Hold to charge, release to cut a lane straight through a lane.",
    { dmg: 46, head: 1.5, rpm: 95, auto: false, charge: 0.55, chargeMul: 2.1, mag: 8, reserve: 32, reload: 2.4, spreadHip: 2, spreadAds: 0, adsTime: 0.34, adsFov: 50, range: 140, falloff: [90, 140, 0.8], recoil: { v: 1.3, h: 0.1, kick: 0.07, recover: 6 }, speed: 0.93, type: "beam", beamColor: 11766015 },
    { kind: "energy", len: 0.88, body: 2366266, accent: 11766015, barrel: 0.42, stock: true, sight: "dot", glow: true }
  ),
  P(
    "quasar",
    "QUASAR-0",
    5200,
    "mythic",
    "Bouncing plasma bolts. Angles that should not work, do.",
    { dmg: 34, head: 1.4, rpm: 150, auto: false, mag: 10, reserve: 40, reload: 2.2, spreadHip: 1.2, spreadAds: 0.1, adsTime: 0.26, adsFov: 58, range: 200, falloff: [120, 200, 0.9], recoil: { v: 0.9, h: 0.15, kick: 0.05, recover: 7 }, speed: 0.96, type: "projectile", projSpeed: 95, projColor: 7268351, splash: 2.2, bounces: 2 },
    { kind: "energy", len: 0.8, body: 1055278, accent: 7268351, barrel: 0.36, stock: true, sight: "holo", glow: true }
  ),
  // ══════════════════════════ SECONDARIES ══════════════════════════
  S(
    "q1",
    "SIDEARM Q1",
    0,
    "standard",
    "The free pistol. Surprisingly rude at close range.",
    { dmg: 30, head: 2, rpm: 400, auto: false, mag: 12, reserve: 48, reload: 1.5, spreadHip: 2, spreadAds: 0.4, adsTime: 0.16, adsFov: 66, range: 60, falloff: [25, 60, 0.6], recoil: { v: 1, h: 0.3, kick: 0.05, recover: 8 }, speed: 1.08, type: "hitscan" },
    { kind: "pistol", len: 0.3, body: 2896187, accent: 10466248, barrel: 0.12, stock: false, sight: "iron" }
  ),
  S(
    "vesper",
    "VESPER",
    350,
    "standard",
    "Six rounds of .44. Reloads like a grandfather, hits like a truck.",
    { dmg: 62, head: 2.1, rpm: 165, auto: false, mag: 6, reserve: 24, reload: 2.6, spreadHip: 2.6, spreadAds: 0.25, adsTime: 0.24, adsFov: 52, range: 70, falloff: [35, 70, 0.65], recoil: { v: 2.1, h: 0.35, kick: 0.13, recover: 5 }, speed: 1.05, type: "hitscan" },
    { kind: "revolver", len: 0.34, body: 3878703, accent: 14267266, barrel: 0.16, stock: false, sight: "iron" }
  ),
  S(
    "moskito",
    "MOSKITO",
    600,
    "rare",
    "Machine pistol. Annoying, buzzing, endless.",
    { dmg: 13, head: 1.6, rpm: 1250, auto: true, mag: 22, reserve: 88, reload: 1.4, spreadHip: 3.4, spreadAds: 0.9, adsTime: 0.13, adsFov: 74, range: 40, falloff: [15, 40, 0.45], recoil: { v: 0.5, h: 0.55, kick: 0.022, recover: 10 }, speed: 1.1, type: "hitscan" },
    { kind: "pistol", len: 0.26, body: 2764586, accent: 12842372, barrel: 0.08, stock: false, sight: "iron" }
  ),
  S(
    "hornet",
    "HORNET",
    950,
    "rare",
    "Burst pistol. Two taps and a corpse.",
    { dmg: 24, head: 1.9, rpm: 900, auto: false, burst: 2, burstDelay: 0.16, mag: 18, reserve: 72, reload: 1.6, spreadHip: 1.8, spreadAds: 0.2, adsTime: 0.15, adsFov: 62, range: 65, falloff: [30, 65, 0.6], recoil: { v: 0.8, h: 0.25, kick: 0.04, recover: 9 }, speed: 1.07, type: "hitscan" },
    { kind: "pistol", len: 0.3, body: 3748639, accent: 16765286, barrel: 0.13, stock: false, sight: "dot" }
  ),
  S(
    "cutlass",
    "CUTLASS",
    1200,
    "rare",
    "Sawed off. Two barrels, one doorway, zero survivors.",
    { dmg: 9, head: 1.3, rpm: 260, auto: false, pellets: 9, mag: 2, reserve: 16, reload: 1.9, spreadHip: 7.5, spreadAds: 5, adsTime: 0.2, adsFov: 74, range: 22, falloff: [6, 20, 0.22], recoil: { v: 2.4, h: 0.8, kick: 0.18, recover: 5 }, speed: 1.09, type: "hitscan" },
    { kind: "shotgun", len: 0.34, body: 4205086, accent: 16752970, barrel: 0.16, stock: false, sight: "iron" }
  ),
  S(
    "needle",
    "NEEDLE",
    1700,
    "epic",
    "Precision sidearm. Headshots are not lucky, they are earned.",
    { dmg: 38, head: 3, rpm: 340, auto: false, mag: 10, reserve: 40, reload: 1.7, spreadHip: 1.6, spreadAds: 0.02, adsTime: 0.2, adsFov: 44, range: 90, falloff: [50, 90, 0.75], recoil: { v: 1.2, h: 0.15, kick: 0.06, recover: 7 }, speed: 1.06, type: "hitscan" },
    { kind: "pistol", len: 0.36, body: 1976883, accent: 7268351, barrel: 0.18, stock: false, sight: "dot" }
  ),
  S(
    "judge",
    "JUDGE",
    2300,
    "epic",
    "Hand cannon. Slow, loud, final.",
    { dmg: 74, head: 2, rpm: 145, auto: false, mag: 5, reserve: 20, reload: 2.4, spreadHip: 3, spreadAds: 0.3, adsTime: 0.26, adsFov: 54, range: 80, falloff: [40, 80, 0.7], recoil: { v: 2.6, h: 0.45, kick: 0.17, recover: 4.6 }, speed: 1, type: "hitscan" },
    { kind: "revolver", len: 0.38, body: 2365978, accent: 16731501, barrel: 0.2, stock: false, sight: "iron" }
  ),
  S(
    "flare",
    "FLARE-9",
    1500,
    "rare",
    "Micro SMG that empties before the thought finishes.",
    { dmg: 11, head: 1.5, rpm: 1400, auto: true, mag: 30, reserve: 120, reload: 1.5, spreadHip: 3.8, spreadAds: 1.1, adsTime: 0.12, adsFov: 76, range: 34, falloff: [12, 34, 0.4], recoil: { v: 0.45, h: 0.6, kick: 0.02, recover: 11 }, speed: 1.12, type: "hitscan" },
    { kind: "smg", len: 0.28, body: 3351607, accent: 16743129, barrel: 0.08, stock: false, sight: "iron" }
  ),
  S(
    "prismp",
    "PRISM PISTOL",
    3e3,
    "legendary",
    "Charged sidearm. A fully charged shot staggers anything it touches.",
    { dmg: 30, head: 1.6, rpm: 220, auto: false, charge: 0.4, chargeMul: 1.9, mag: 8, reserve: 32, reload: 1.8, spreadHip: 1.4, spreadAds: 0.05, adsTime: 0.22, adsFov: 58, range: 110, falloff: [60, 110, 0.8], recoil: { v: 0.9, h: 0.12, kick: 0.05, recover: 7 }, speed: 1.05, type: "beam", beamColor: 16754928 },
    { kind: "energy", len: 0.34, body: 2825021, accent: 16754928, barrel: 0.14, stock: false, sight: "dot", glow: true }
  ),
  S(
    "twinfang",
    "TWINFANG",
    4200,
    "mythic",
    "Akimbo. Twice the lead, twice the fun, zero subtlety.",
    { dmg: 20, head: 1.7, rpm: 700, auto: true, mag: 24, reserve: 96, reload: 2.1, spreadHip: 3, spreadAds: 0.7, adsTime: 0.18, adsFov: 70, range: 50, falloff: [22, 50, 0.5], recoil: { v: 0.6, h: 0.5, kick: 0.03, recover: 9 }, speed: 1.08, type: "hitscan", akimbo: true },
    { kind: "pistol", len: 0.28, body: 2957103, accent: 16731501, barrel: 0.1, stock: false, sight: "iron", akimbo: true }
  ),
  // ══════════════════════════ MELEE ══════════════════════════
  M(
    "knife",
    "TRENCH KNIFE",
    0,
    "standard",
    "Free, fast, and lethal to anyone who turns their back.",
    { dmg: 55, back: 2.2, rate: 2.2, reach: 2, speed: 1.15, type: "melee", style: "stab" },
    { kind: "blade", len: 0.42, body: 3094855, accent: 14673903, blade: 13227746 }
  ),
  M(
    "fists",
    "QYN FISTS",
    300,
    "standard",
    "Nothing in your hands means nothing slowing you down.",
    { dmg: 42, back: 1.4, rate: 3.4, reach: 1.7, speed: 1.22, type: "melee", style: "punch" },
    { kind: "fist", len: 0.2, body: 14721395, accent: 3094855 }
  ),
  M(
    "bat",
    "SLUGGER",
    550,
    "standard",
    "Aluminium. Sends people exactly where you want them.",
    { dmg: 68, back: 1.2, rate: 1.5, reach: 2.2, speed: 1.08, type: "melee", style: "swing", knock: 9 },
    { kind: "blunt", len: 0.62, body: 12109007, accent: 3094855 }
  ),
  M(
    "machete",
    "MACHETE",
    800,
    "rare",
    "Wide arcs. Rewards players who never stop moving.",
    { dmg: 72, back: 1.6, rate: 1.8, reach: 2.3, speed: 1.12, type: "melee", style: "swing" },
    { kind: "blade", len: 0.6, body: 2832940, accent: 10212447, blade: 14149832 }
  ),
  M(
    "tonfa",
    "TONFA PAIR",
    1100,
    "rare",
    "Fast combo strikes. Two hits land before one heavy swing would.",
    { dmg: 46, back: 1.5, rate: 3, reach: 1.9, speed: 1.16, type: "melee", style: "punch" },
    { kind: "blunt", len: 0.44, body: 2303533, accent: 16765286 }
  ),
  M(
    "katana",
    "KATANA",
    1800,
    "epic",
    "Clean, long, merciless. The fastest draw in the armory.",
    { dmg: 88, back: 1.8, rate: 1.5, reach: 2.7, speed: 1.1, type: "melee", style: "slash" },
    { kind: "blade", len: 0.95, body: 1316379, accent: 16731501, blade: 15922943 }
  ),
  M(
    "axe",
    "FIRE AXE",
    1600,
    "rare",
    "Slow commit, huge payoff. Do not miss.",
    { dmg: 105, back: 1.5, rate: 0.9, reach: 2.4, speed: 1, type: "melee", style: "chop" },
    { kind: "blunt", len: 0.7, body: 4861724, accent: 16747069, blade: 14277081 }
  ),
  M(
    "spear",
    "QYN SPEAR",
    2400,
    "epic",
    "Longest reach in the game. Poke from outside their comfort.",
    { dmg: 88, back: 1.3, rate: 1.5, reach: 3.4, speed: 1.06, type: "melee", style: "stab" },
    { kind: "blade", len: 1.25, body: 2764602, accent: 7268351, blade: 11069951 }
  ),
  M(
    "sledge",
    "SLEDGE",
    2800,
    "epic",
    "Two handed apology. Anything it touches stops moving.",
    { dmg: 130, back: 1.2, rate: 0.75, reach: 2.5, speed: 0.94, type: "melee", style: "chop", knock: 16 },
    { kind: "blunt", len: 0.8, body: 3817287, accent: 16752970 }
  ),
  M(
    "qynblade",
    "QYN BLADE",
    5e3,
    "mythic",
    "A blade made of condensed momentum. The faster you move, the harder it cuts.",
    { dmg: 84, back: 2, rate: 2, reach: 2.6, speed: 1.2, type: "melee", style: "slash", momentum: 2 },
    { kind: "energy", len: 0.9, body: 1708080, accent: 11766015, blade: 14136319, glow: true }
  ),
  // ══════════════════════════ UTILITIES ══════════════════════════
  U(
    "frag",
    "FRAG",
    0,
    "standard",
    "The classic. Cook it and it lands exactly when you arrive.",
    { type: "throw", dmg: 110, radius: 5.5, fuse: 2.2, count: 1, speed: 1, color: 9425231 },
    { kind: "grenade", body: 3951150, accent: 9425231 }
  ),
  U(
    "flash",
    "FLASH",
    400,
    "standard",
    "Blinds for 1.8s. Slide in behind it.",
    { type: "throw", dmg: 8, radius: 7, fuse: 1.4, count: 2, flash: 1.8, speed: 1, color: 16774064 },
    { kind: "grenade", body: 4868690, accent: 16774064 }
  ),
  U(
    "smoke",
    "SMOKE",
    500,
    "standard",
    "Six seconds of cover you can slide straight out of.",
    { type: "throw", dmg: 0, radius: 6, fuse: 1, count: 2, smoke: 6, speed: 1, color: 12568529 },
    { kind: "grenade", body: 3817287, accent: 12568529 }
  ),
  U(
    "emp",
    "EMP",
    900,
    "rare",
    "Slows and strips shields. Also pops enemy utility mid flight.",
    { type: "throw", dmg: 25, radius: 6.5, fuse: 1.6, count: 1, slow: 0.45, slowTime: 3, speed: 1, color: 7268351 },
    { kind: "grenade", body: 1976883, accent: 7268351 }
  ),
  U(
    "stim",
    "STIM",
    700,
    "rare",
    "Four seconds of +35% speed and a heal over time. Chaining fuel.",
    { type: "self", heal: 45, haste: 1.35, hasteTime: 4, count: 2, speed: 1, color: 16735631 },
    { kind: "device", body: 3809066, accent: 16735631 }
  ),
  U(
    "dash",
    "DASH CHARGE",
    1100,
    "rare",
    "Instant impulse in your movement direction. Converts a slide into a launch.",
    { type: "self", impulse: 15, count: 2, speed: 1, color: 7268351 },
    { kind: "device", body: 1780282, accent: 7268351 }
  ),
  U(
    "grapnel",
    "GRAPNEL",
    1500,
    "epic",
    "Fires a line and yanks you to it. Air strafe out of the pull for real speed.",
    { type: "hook", count: 2, pull: 34, speed: 1, color: 16765286 },
    { kind: "device", body: 3354650, accent: 16765286 }
  ),
  U(
    "barrier",
    "BARRIER",
    1300,
    "rare",
    "Deploys a 250 hp wall. Slide over it, shoot under it, play around it.",
    { type: "place", hp: 250, count: 1, speed: 1, color: 10320895 },
    { kind: "device", body: 2367290, accent: 10320895 }
  ),
  U(
    "mine",
    "PROX MINE",
    1700,
    "epic",
    "Arms anywhere, including ceilings. Punishes predictable routes.",
    { type: "place", dmg: 95, radius: 4, count: 2, arm: 0.8, speed: 1, color: 16731501 },
    { kind: "device", body: 3809058, accent: 16731501 }
  ),
  U(
    "decoy",
    "ECHO DECOY",
    2200,
    "epic",
    "A sprinting hologram of you. People shoot it. Every time.",
    { type: "throw", dmg: 0, radius: 0, fuse: 8, count: 2, decoy: true, speed: 1, color: 3791242 },
    { kind: "device", body: 1848103, accent: 3791242 }
  )
];
var WEAPON_MAP = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
var bySlot = (slot) => WEAPONS.filter((w) => w.slot === slot);
var RARITY = {
  standard: { color: "#9fb3c8", label: "STANDARD" },
  rare: { color: "#6ee7ff", label: "RARE" },
  epic: { color: "#b388ff", label: "EPIC" },
  legendary: { color: "#ffd166", label: "LEGENDARY" },
  mythic: { color: "#ff4d6d", label: "MYTHIC" }
};
var DEFAULT_LOADOUT = { primary: "vex9", secondary: "q1", melee: "knife", utility: "frag" };

// src/game/core/Persistence.js
var KEY = "qyngun.profile.v1";
var DEFAULT_PROFILE = {
  handle: "PLAYER",
  qyns: 1500,
  xp: 0,
  level: 1,
  unlocked: ["vex9", "q1", "knife", "frag"],
  skins: ["stock"],
  skin: "stock",
  loadout: { primary: "vex9", secondary: "q1", melee: "knife", utility: "frag" },
  loadouts: {},
  stats: { matches: 0, wins: 0, rounds: 0, kills: 0, deaths: 0, damage: 0, topSpeed: 0, chains: {}, headshots: 0 },
  settings: {
    fov: 95,
    sensitivity: 1,
    volume: 0.7,
    sound: true,
    quality: "high",
    crosshair: "dot",
    showMovement: true,
    invertY: false,
    botLevel: "normal",
    adaptive: true
  }
};
function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_PROFILE);
    const p = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_PROFILE),
      ...p,
      stats: { ...DEFAULT_PROFILE.stats, ...p.stats || {} },
      settings: { ...DEFAULT_PROFILE.settings, ...p.settings || {} },
      loadout: { ...DEFAULT_PROFILE.loadout, ...p.loadout || {} }
    };
  } catch (e) {
    return structuredClone(DEFAULT_PROFILE);
  }
}
function saveProfile(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch (e) {
  }
}
function xpForLevel(level) {
  return 250 + (level - 1) * 220;
}
function addXp(profile, amount) {
  let xp = profile.xp + amount;
  let level = profile.level;
  let levelsGained = 0;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level++;
    levelsGained++;
  }
  profile.xp = xp;
  profile.level = level;
  return levelsGained;
}
function rewardMatch(profile, { won, scoreA, scoreB, kills, deaths, damage, headshots, topSpeed, chains }) {
  const roundQyns = scoreA * 30;
  const killQyns = kills * 14;
  const headQyns = headshots * 5;
  const winQyns = won ? 180 : 40;
  const chainQyns = (chains || 0) * 20;
  const qyns = roundQyns + killQyns + headQyns + winQyns + chainQyns;
  const xp = Math.round(qyns * 0.65 + damage * 0.25);
  profile.qyns += qyns;
  const levels = addXp(profile, xp);
  const s = profile.stats;
  s.matches++;
  if (won) s.wins++;
  s.rounds += scoreA + scoreB;
  s.kills += kills;
  s.deaths += deaths;
  s.damage += Math.round(damage);
  s.headshots += headshots;
  s.topSpeed = Math.max(s.topSpeed || 0, Math.round(topSpeed * 10) / 10);
  saveProfile(profile);
  return { qyns, xp, levels, breakdown: { roundQyns, killQyns, headQyns, winQyns, chainQyns } };
}
function unlock(profile, id, cost) {
  if (profile.unlocked.includes(id)) return true;
  if (profile.qyns < cost) return false;
  profile.qyns -= cost;
  profile.unlocked.push(id);
  saveProfile(profile);
  return true;
}
function unlockSkin(profile, id, cost) {
  if (profile.skins.includes(id)) return true;
  if (profile.qyns < cost) return false;
  profile.qyns -= cost;
  profile.skins.push(id);
  saveProfile(profile);
  return true;
}

// src/ui/Armory.jsx
function Armory({ profile, save, onBack, toast }) {
  const [tab, setTab] = useState3("primary");
  const owned = (id) => profile.unlocked.includes(id);
  const buy = (w) => {
    if (owned(w.id)) {
      toast(`${w.name} ALREADY OWNED`);
      return;
    }
    const p = structuredClone(profile);
    if (!unlock(p, w.id, w.qyns)) {
      toast("NOT ENOUGH QYNS", true);
      return;
    }
    save(p);
    toast(`${w.name} UNLOCKED`);
  };
  const equip = (w) => {
    if (!owned(w.id)) return buy(w);
    const p = { ...profile, loadout: { ...profile.loadout, [w.slot]: w.id } };
    save(p);
    toast(`${w.name} EQUIPPED`);
  };
  return /* @__PURE__ */ React3.createElement("div", { className: "screen" }, /* @__PURE__ */ React3.createElement("div", { className: "topbar" }, /* @__PURE__ */ React3.createElement("div", { className: "logo" }, "QynGun", /* @__PURE__ */ React3.createElement("small", null, "ARMORY")), /* @__PURE__ */ React3.createElement("div", { className: "wallet" }, /* @__PURE__ */ React3.createElement("div", { className: "chip" }, /* @__PURE__ */ React3.createElement("b", null, profile.qyns), " \u25C8 QYNS"), /* @__PURE__ */ React3.createElement("button", { className: "btn sm ghost", onClick: onBack }, "\u25C0 MENU"))), /* @__PURE__ */ React3.createElement("div", { className: "content" }, /* @__PURE__ */ React3.createElement("div", { className: "tabs" }, SLOTS.map((s) => /* @__PURE__ */ React3.createElement("button", { key: s.id, className: `tab ${tab === s.id ? "on" : ""}`, onClick: () => setTab(s.id) }, s.name))), /* @__PURE__ */ React3.createElement("div", { className: "grid", style: { gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))" } }, bySlot(tab).map((w) => {
    const r = RARITY[w.rarity];
    const isOwned = owned(w.id);
    const eq = profile.loadout[w.slot] === w.id;
    return /* @__PURE__ */ React3.createElement("div", { key: w.id, className: `card ${eq ? "on" : ""} ${isOwned ? "" : "locked"}`, onClick: () => equip(w) }, /* @__PURE__ */ React3.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 8 } }, /* @__PURE__ */ React3.createElement("div", { className: "nm", style: { color: r.color } }, w.name), /* @__PURE__ */ React3.createElement("span", { className: "tag", style: { color: r.color } }, r.label)), /* @__PURE__ */ React3.createElement("div", { className: "ds" }, w.desc), /* @__PURE__ */ React3.createElement("div", { className: "stats4" }, /* @__PURE__ */ React3.createElement("div", null, /* @__PURE__ */ React3.createElement("span", null, "DMG"), /* @__PURE__ */ React3.createElement("b", null, w.stats.dmg ?? "\u2014")), /* @__PURE__ */ React3.createElement("div", null, /* @__PURE__ */ React3.createElement("span", null, "RPM"), /* @__PURE__ */ React3.createElement("b", null, w.stats.rpm ?? "\u2014")), /* @__PURE__ */ React3.createElement("div", null, /* @__PURE__ */ React3.createElement("span", null, "MAG"), /* @__PURE__ */ React3.createElement("b", null, w.stats.mag ?? "\u2014")), /* @__PURE__ */ React3.createElement("div", null, /* @__PURE__ */ React3.createElement("span", null, "RLD"), /* @__PURE__ */ React3.createElement("b", null, w.stats.reload ?? "\u2014", "s")), /* @__PURE__ */ React3.createElement("div", null, /* @__PURE__ */ React3.createElement("span", null, "HEAD"), /* @__PURE__ */ React3.createElement("b", null, "\xD7", w.stats.head ?? "\u2014")), /* @__PURE__ */ React3.createElement("div", null, /* @__PURE__ */ React3.createElement("span", null, "RANGE"), /* @__PURE__ */ React3.createElement("b", null, w.stats.range ?? "\u2014", "m")), /* @__PURE__ */ React3.createElement("div", null, /* @__PURE__ */ React3.createElement("span", null, "SPREAD"), /* @__PURE__ */ React3.createElement("b", null, w.stats.spreadHip ?? w.stats.reach ?? "\u2014")), /* @__PURE__ */ React3.createElement("div", null, /* @__PURE__ */ React3.createElement("span", null, "SPEED"), /* @__PURE__ */ React3.createElement("b", null, ((w.stats.speed ?? 1) * 100).toFixed(0), "%"))), w.stats.knock > 0 && /* @__PURE__ */ React3.createElement("div", { style: { marginTop: 8, fontSize: 10, color: "var(--or)" } }, "KNOCKBACK ", w.stats.knock), w.stats.back && /* @__PURE__ */ React3.createElement("div", { style: { marginTop: 8, fontSize: 10, color: "var(--rd)" } }, "BACKSTAB \xD7", w.stats.back), /* @__PURE__ */ React3.createElement("div", { className: "mt" }, isOwned ? /* @__PURE__ */ React3.createElement("span", { className: "price own" }, eq ? "\u25CF EQUIPPED" : "OWNED \u2014 EQUIP") : /* @__PURE__ */ React3.createElement("span", { className: "price" }, w.qyns, " \u25C8 \u2014 BUY"), /* @__PURE__ */ React3.createElement("span", null, WEAPONS.indexOf(w) + 1)));
  }))));
}

// src/ui/Skins.jsx
import React4 from "react";

// src/game/data/skins.js
var SKINS = [
  { id: "stock", name: "FACTORY", qyn: 0, desc: "Standard issue.", body: null, accent: null, glow: null, trim: "#9fb3c8" },
  { id: "midnight", name: "MIDNIGHT", qyn: 450, desc: "Matte black with a cold blue sheen.", body: 1316380, accent: 4020864, glow: 2376286, trim: "#5b8ec7" },
  { id: "arctic", name: "ARCTIC DRIFT", qyn: 700, desc: "Frost white plate, cyan piping.", body: 14674419, accent: 7268351, glow: 10218239, trim: "#bfefff" },
  { id: "ember", name: "EMBER", qyn: 900, desc: "Burnt orange over scorched steel.", body: 2759186, accent: 16742959, glow: 16751949, trim: "#ff9d4d" },
  { id: "neon", name: "NEON DRIFT", qyn: 1400, desc: "Hot pink and electric cyan. Loud on purpose.", body: 1773346, accent: 16727536, glow: 16743136, trim: "#ff7ae0" },
  { id: "hazard", name: "HAZARD", qyn: 1200, desc: "Industrial yellow with black chevrons.", body: 2829090, accent: 16769357, glow: 16773258, trim: "#ffe14d" },
  { id: "vapor", name: "VAPORWAVE", qyn: 1800, desc: "Sunset gradient, chrome highlights.", body: 2825030, accent: 16740039, glow: 9109503, trim: "#8affff" },
  { id: "jade", name: "JADE PROTOCOL", qyn: 1600, desc: "Deep jade with gold inlay.", body: 994086, accent: 4054167, glow: 10354640, trim: "#3ddc97" },
  { id: "carbon", name: "CARBON WEAVE", qyn: 2e3, desc: "Woven carbon, crimson thread.", body: 1118740, accent: 16731501, glow: 8004147, trim: "#ff4d6d" },
  { id: "solar", name: "SOLAR FLARE", qyn: 2600, desc: "White hot. Glows brighter the faster you move.", body: 3810822, accent: 16758531, glow: 16769162, trim: "#ffb703", reactive: true },
  { id: "void", name: "VOIDLINE", qyn: 3200, desc: "Absorbs light. Edges hum violet.", body: 657935, accent: 8141549, glow: 11766015, trim: "#b388ff", reactive: true },
  { id: "gilded", name: "GILDED STANDARD", qyn: 5e3, desc: "Solid gold. For players who have already won.", body: 4863752, accent: 16766720, glow: 16774048, trim: "#ffd700", reactive: true }
];
var SKIN_MAP = Object.fromEntries(SKINS.map((s) => [s.id, s]));

// src/ui/Skins.jsx
var hex = (n) => "#" + (n ?? 0).toString(16).padStart(6, "0");
function Skins({ profile, save, onBack, toast }) {
  const setSkin = (s) => {
    if (!profile.skins.includes(s.id)) {
      const p = structuredClone(profile);
      if (!unlockSkin(p, s.id, s.qyn)) {
        toast("NOT ENOUGH QYNS", true);
        return;
      }
      save(p);
      toast(`${s.name} UNLOCKED`);
      return;
    }
    save({ ...profile, skin: s.id });
    toast(`${s.name} EQUIPPED`);
  };
  return /* @__PURE__ */ React4.createElement("div", { className: "screen" }, /* @__PURE__ */ React4.createElement("div", { className: "topbar" }, /* @__PURE__ */ React4.createElement("div", { className: "logo" }, "QynGun", /* @__PURE__ */ React4.createElement("small", null, "SKINS")), /* @__PURE__ */ React4.createElement("div", { className: "wallet" }, /* @__PURE__ */ React4.createElement("div", { className: "chip" }, /* @__PURE__ */ React4.createElement("b", null, profile.qyns), " \u25C8 QYNS"), /* @__PURE__ */ React4.createElement("button", { className: "btn sm ghost", onClick: onBack }, "\u25C0 MENU"))), /* @__PURE__ */ React4.createElement("div", { className: "content" }, /* @__PURE__ */ React4.createElement("div", { className: "h" }, "WEAPON SKINS \u2014 APPLIED TO EVERY GUN YOU CARRY"), /* @__PURE__ */ React4.createElement("div", { className: "skins" }, SKINS.map((s) => {
    const owned = profile.skins.includes(s.id);
    const on = profile.skin === s.id;
    return /* @__PURE__ */ React4.createElement("div", { key: s.id, className: `card ${on ? "on" : ""} ${owned ? "" : "locked"}`, onClick: () => setSkin(s) }, /* @__PURE__ */ React4.createElement("div", { className: "nm" }, s.name), /* @__PURE__ */ React4.createElement("div", { className: "ds" }, s.desc), /* @__PURE__ */ React4.createElement("div", { className: "swatch" }, /* @__PURE__ */ React4.createElement("i", { style: { background: hex(s.body ?? 3094855) } }), /* @__PURE__ */ React4.createElement("i", { style: { background: hex(s.accent ?? 7268351) } }), /* @__PURE__ */ React4.createElement("i", { style: { background: hex(s.glow ?? s.accent ?? 7268351) } }), /* @__PURE__ */ React4.createElement("i", { style: { background: s.trim } })), /* @__PURE__ */ React4.createElement("div", { className: "mt" }, owned ? /* @__PURE__ */ React4.createElement("span", { className: "price own" }, on ? "\u25CF EQUIPPED" : "OWNED") : /* @__PURE__ */ React4.createElement("span", { className: "price" }, s.qyn, " \u25C8 \u2014 BUY"), s.reactive && /* @__PURE__ */ React4.createElement("span", { style: { color: "var(--vi)", fontSize: 9, letterSpacing: ".1em" } }, "REACTIVE")));
  }))));
}

// src/ui/Settings.jsx
import React5 from "react";
function Slider({ label, value, min, max, step, onChange, fmt }) {
  return /* @__PURE__ */ React5.createElement("div", { className: "set" }, /* @__PURE__ */ React5.createElement("label", null, label), /* @__PURE__ */ React5.createElement("input", { type: "range", min, max, step, value, onChange: (e) => onChange(parseFloat(e.target.value)) }), /* @__PURE__ */ React5.createElement("b", { style: { width: 74, textAlign: "right", fontFamily: "var(--mono)", fontSize: 12 } }, fmt ? fmt(value) : value));
}
function Toggle({ label, value, onChange }) {
  return /* @__PURE__ */ React5.createElement("div", { className: "set" }, /* @__PURE__ */ React5.createElement("label", null, label), /* @__PURE__ */ React5.createElement("div", { className: `sw ${value ? "on" : ""}`, onClick: () => onChange(!value) }, /* @__PURE__ */ React5.createElement("i", null)));
}
function Settings({ profile, save, onBack }) {
  const s = profile.settings;
  const set = (k, v) => save({ ...profile, settings: { ...s, [k]: v } });
  return /* @__PURE__ */ React5.createElement("div", { className: "screen" }, /* @__PURE__ */ React5.createElement("div", { className: "topbar" }, /* @__PURE__ */ React5.createElement("div", { className: "logo" }, "QynGun", /* @__PURE__ */ React5.createElement("small", null, "SETTINGS")), /* @__PURE__ */ React5.createElement("div", { className: "wallet" }, /* @__PURE__ */ React5.createElement("button", { className: "btn sm ghost", onClick: onBack }, "\u25C0 MENU"))), /* @__PURE__ */ React5.createElement("div", { className: "content", style: { maxWidth: 760 } }, /* @__PURE__ */ React5.createElement("div", { className: "h" }, "FEEL"), /* @__PURE__ */ React5.createElement(Slider, { label: "FIELD OF VIEW", value: s.fov, min: 75, max: 120, step: 1, onChange: (v) => set("fov", v), fmt: (v) => v + "\xB0" }), /* @__PURE__ */ React5.createElement(Slider, { label: "MOUSE SENSITIVITY", value: s.sensitivity, min: 0.2, max: 3, step: 0.05, onChange: (v) => set("sensitivity", v), fmt: (v) => v.toFixed(2) }), /* @__PURE__ */ React5.createElement(Toggle, { label: "INVERT Y", value: s.invertY, onChange: (v) => set("invertY", v) }), /* @__PURE__ */ React5.createElement(Slider, { label: "VOLUME", value: s.volume, min: 0, max: 1, step: 0.05, onChange: (v) => set("volume", v), fmt: (v) => Math.round(v * 100) + "%" }), /* @__PURE__ */ React5.createElement(Toggle, { label: "SOUND", value: s.sound, onChange: (v) => set("sound", v) }), /* @__PURE__ */ React5.createElement("div", { className: "h", style: { marginTop: 26 } }, "DISPLAY"), /* @__PURE__ */ React5.createElement("div", { className: "set" }, /* @__PURE__ */ React5.createElement("label", null, "QUALITY"), /* @__PURE__ */ React5.createElement("select", { className: "sel", value: s.quality, onChange: (e) => set("quality", e.target.value) }, /* @__PURE__ */ React5.createElement("option", { value: "high" }, "HIGH"), /* @__PURE__ */ React5.createElement("option", { value: "low" }, "PERFORMANCE"))), /* @__PURE__ */ React5.createElement(Toggle, { label: "MOVEMENT TELEMETRY PANEL", value: s.showMovement, onChange: (v) => set("showMovement", v) }), /* @__PURE__ */ React5.createElement(Toggle, { label: "ADAPTIVE RESOLUTION", value: s.adaptive !== false, onChange: (v) => set("adaptive", v) }), /* @__PURE__ */ React5.createElement("div", { className: "hint", style: { marginTop: 4 } }, "Drops pixels instead of frames when the FPS dips."), /* @__PURE__ */ React5.createElement("div", { className: "h", style: { marginTop: 26 } }, "GAME"), /* @__PURE__ */ React5.createElement("div", { className: "set" }, /* @__PURE__ */ React5.createElement("label", null, "BOT DIFFICULTY"), /* @__PURE__ */ React5.createElement("select", { className: "sel", value: s.botLevel, onChange: (e) => set("botLevel", e.target.value) }, /* @__PURE__ */ React5.createElement("option", { value: "easy" }, "EASY"), /* @__PURE__ */ React5.createElement("option", { value: "normal" }, "NORMAL"), /* @__PURE__ */ React5.createElement("option", { value: "hard" }, "HARD"), /* @__PURE__ */ React5.createElement("option", { value: "qyn" }, "QYN"))), /* @__PURE__ */ React5.createElement("div", { style: { marginTop: 26, display: "flex", gap: 12 } }, /* @__PURE__ */ React5.createElement("button", { className: "btn ghost", onClick: () => {
    if (!confirm("Reset all progress, Qyns and unlocks?")) return;
    localStorage.removeItem("qyngun.profile.v1");
    location.reload();
  } }, "RESET PROGRESS"))));
}

// src/ui/Result.jsx
import React6 from "react";
function Result({ data, profile, onAgain, onLobby }) {
  const won = data.winner === "a";
  const st = data.stats || {};
  const acc = st.shots ? Math.round(st.hits / st.shots * 100) : 0;
  const board = (data.board || []).slice().sort((a, b) => b.damage - a.damage);
  const mvp = board[0];
  return /* @__PURE__ */ React6.createElement("div", { className: "screen" }, /* @__PURE__ */ React6.createElement("div", { className: "hero" }, /* @__PURE__ */ React6.createElement("h1", { style: {
    fontSize: "clamp(40px,8vw,104px)",
    background: won ? "linear-gradient(96deg,#39d98a,#fff 50%,#6ee7ff)" : "linear-gradient(96deg,#ff4d6d,#fff 50%,#ff8a3d)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent"
  } }, won ? "MATCH WON" : "MATCH LOST"), /* @__PURE__ */ React6.createElement("p", null, data.scoreA, " \u2014 ", data.scoreB), /* @__PURE__ */ React6.createElement("div", { className: "row", style: { marginTop: 24, justifyContent: "center" } }, [
    ["ROUNDS", `${data.scoreA}/${data.scoreA + data.scoreB}`],
    ["KILLS", st.kills || 0],
    ["DEATHS", st.deaths || 0],
    ["HEADSHOTS", st.headshots || 0],
    ["DAMAGE", Math.round(st.damage || 0)],
    ["ACCURACY", acc + "%"],
    ["TOP SPEED", (st.topSpeed || 0).toFixed(1) + " m/s"]
  ].map(([k, v]) => /* @__PURE__ */ React6.createElement("div", { key: k, className: "chip", style: { flexDirection: "column", alignItems: "center", gap: 4, minWidth: 116 } }, /* @__PURE__ */ React6.createElement("span", { style: { fontSize: 8.5, letterSpacing: ".18em", color: "var(--dim)" } }, k), /* @__PURE__ */ React6.createElement("b", { style: { fontSize: 17, color: "var(--cy)" } }, v)))), board.length > 1 && /* @__PURE__ */ React6.createElement("div", { style: { width: 460, marginTop: 28 } }, /* @__PURE__ */ React6.createElement("div", { className: "h", style: { textAlign: "left" } }, "SCOREBOARD"), board.map((r, i) => /* @__PURE__ */ React6.createElement("div", { key: r.name, className: `br ${r.you ? "you" : ""}`, style: {
    display: "grid",
    gridTemplateColumns: "1fr 40px 40px 40px 70px 48px",
    gap: 8,
    fontFamily: "var(--mono)",
    fontSize: 11,
    padding: "4px 6px",
    background: i === 0 ? "rgba(255,209,102,.09)" : "rgba(255,255,255,.022)",
    borderLeft: `2px solid ${r.you ? "var(--cy)" : r.team === "a" ? "rgba(110,231,255,.35)" : "rgba(255,138,61,.35)"}`
  } }, /* @__PURE__ */ React6.createElement("span", { style: { textAlign: "left" } }, r.name, i === 0 ? " \u2605" : ""), /* @__PURE__ */ React6.createElement("span", { style: { textAlign: "right", color: "var(--gr)" } }, r.kills), /* @__PURE__ */ React6.createElement("span", { style: { textAlign: "right", color: "var(--rd)" } }, r.deaths), /* @__PURE__ */ React6.createElement("span", { style: { textAlign: "right", color: "var(--vi)" } }, r.assists || 0), /* @__PURE__ */ React6.createElement("span", { style: { textAlign: "right", color: "var(--dim)" } }, r.damage), /* @__PURE__ */ React6.createElement("span", { style: { textAlign: "right", color: "var(--dim2)" } }, r.acc, "%"))), mvp && /* @__PURE__ */ React6.createElement("div", { style: { marginTop: 8, fontSize: 10, color: "var(--gd)", letterSpacing: ".2em" } }, "MVP \u2014 ", mvp.name, " \xB7 ", mvp.damage, " DAMAGE \xB7 TOP ", mvp.topSpeed, " M/S")), /* @__PURE__ */ React6.createElement("div", { className: "h", style: { marginTop: 34, width: 460, textAlign: "left" } }, "REWARDS"), /* @__PURE__ */ React6.createElement("div", { style: { width: 460 } }, Object.entries(data.breakdown || {}).map(([k, v]) => /* @__PURE__ */ React6.createElement("div", { key: k, className: "kfi", style: { display: "flex", justifyContent: "space-between", marginBottom: 5, width: "100%" } }, /* @__PURE__ */ React6.createElement("span", { style: { color: "var(--dim)" } }, k.replace(/([A-Z])/g, " $1").toUpperCase()), /* @__PURE__ */ React6.createElement("b", { style: { color: "var(--gd)" } }, "+", v, " \u25C8"))), /* @__PURE__ */ React6.createElement("div", { className: "kfi", style: { display: "flex", justifyContent: "space-between", marginTop: 10, width: "100%", borderRightColor: "var(--gd)" } }, /* @__PURE__ */ React6.createElement("b", null, "TOTAL"), /* @__PURE__ */ React6.createElement("b", { style: { color: "var(--gd)" } }, "+", data.qyns, " \u25C8  \xB7  +", data.xp, " XP")), data.levels > 0 && /* @__PURE__ */ React6.createElement("div", { style: { marginTop: 12, color: "var(--vi)", letterSpacing: ".2em", fontSize: 12 } }, "LEVEL UP \u2192 ", profile.level), /* @__PURE__ */ React6.createElement("div", { className: "bar", style: { marginTop: 10 } }, /* @__PURE__ */ React6.createElement("i", { style: { width: profile.xp / xpForLevel(profile.level) * 100 + "%" } }))), /* @__PURE__ */ React6.createElement("div", { className: "row", style: { marginTop: 30 } }, /* @__PURE__ */ React6.createElement("button", { className: "btn pri", onClick: onAgain }, "PLAY AGAIN"), /* @__PURE__ */ React6.createElement("button", { className: "btn", onClick: onLobby }, "BACK TO LOBBY"))));
}

// src/ui/HUD.jsx
import React7 from "react";

// src/game/core/Movement.js
import * as THREE2 from "three";

// src/game/core/Physics.js
import * as THREE from "three";
var clamp = (v, a, b) => v < a ? a : v > b ? b : v;
var Brush = class {
  constructor({ center, half, rot = [0, 0, 0], color = 8950436, tag = "", kind = "solid", friction = 1 }) {
    this.center = new THREE.Vector3(center[0], center[1], center[2]);
    this.half = new THREE.Vector3(half[0], half[1], half[2]);
    this.rot = rot;
    this.quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], "YXZ"));
    this.inv = this.quat.clone().invert();
    this.color = color;
    this.tag = tag;
    this.kind = kind;
    this.friction = friction;
    this.updateAABB();
  }
  updateAABB() {
    const m = new THREE.Matrix4().makeRotationFromQuaternion(this.quat);
    const e = m.elements;
    const h = this.half;
    const ex = Math.abs(e[0]) * h.x + Math.abs(e[4]) * h.y + Math.abs(e[8]) * h.z;
    const ey = Math.abs(e[1]) * h.x + Math.abs(e[5]) * h.y + Math.abs(e[9]) * h.z;
    const ez = Math.abs(e[2]) * h.x + Math.abs(e[6]) * h.y + Math.abs(e[10]) * h.z;
    this.min = new THREE.Vector3(this.center.x - ex, this.center.y - ey, this.center.z - ez);
    this.max = new THREE.Vector3(this.center.x + ex, this.center.y + ey, this.center.z + ez);
  }
};
var _pa = new THREE.Vector3();
var _pb = new THREE.Vector3();
var _q = new THREE.Vector3();
var _delta = new THREE.Vector3();
var _tmp = new THREE.Vector3();
function closestOnSegmentToBox(ax, ay, az, bx, by, bz, hx, hy, hz) {
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const abLen2 = abx * abx + aby * aby + abz * abz;
  let best = Infinity;
  let bt = 0;
  const test = (t) => {
    const px2 = ax + abx * t, py2 = ay + aby * t, pz2 = az + abz * t;
    const qx = clamp(px2, -hx, hx), qy = clamp(py2, -hy, hy), qz = clamp(pz2, -hz, hz);
    const dx = px2 - qx, dy = py2 - qy, dz = pz2 - qz;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < best) {
      best = d2;
      bt = t;
    }
    return d2;
  };
  test(0);
  test(1);
  test(0.5);
  test(0.25);
  test(0.75);
  if (abLen2 > 1e-9) {
    for (let i = 0; i < 5; i++) {
      const px2 = ax + abx * bt, py2 = ay + aby * bt, pz2 = az + abz * bt;
      const qx = clamp(px2, -hx, hx), qy = clamp(py2, -hy, hy), qz = clamp(pz2, -hz, hz);
      const t = clamp(((qx - ax) * abx + (qy - ay) * aby + (qz - az) * abz) / abLen2, 0, 1);
      const d2 = test(t);
      if (d2 < 1e-8) break;
      if (Math.abs(t - bt) < 1e-4) break;
      bt = t;
    }
  }
  const px = ax + abx * bt, py = ay + aby * bt, pz = az + abz * bt;
  _pa.set(px, py, pz);
  _q.set(clamp(px, -hx, hx), clamp(py, -hy, hy), clamp(pz, -hz, hz));
  return _pa.distanceToSquared(_q);
}
var PhysicsWorld = class {
  constructor(cellSize = 8) {
    this.brushes = [];
    this.cell = cellSize;
    this.grid = /* @__PURE__ */ new Map();
  }
  add(brush) {
    const b = brush instanceof Brush ? brush : new Brush(brush);
    this.brushes.push(b);
    return b;
  }
  build() {
    this.grid.clear();
    const c = this.cell;
    for (const b of this.brushes) {
      const x0 = Math.floor(b.min.x / c), x1 = Math.floor(b.max.x / c);
      const y0 = Math.floor(b.min.y / c), y1 = Math.floor(b.max.y / c);
      const z0 = Math.floor(b.min.z / c), z1 = Math.floor(b.max.z / c);
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
          for (let z = z0; z <= z1; z++) {
            const k = x + "," + y + "," + z;
            let arr = this.grid.get(k);
            if (!arr) {
              arr = [];
              this.grid.set(k, arr);
            }
            arr.push(b);
          }
        }
      }
    }
  }
  queryBox(min, max, out) {
    out.length = 0;
    const c = this.cell;
    const x0 = Math.floor(min.x / c), x1 = Math.floor(max.x / c);
    const y0 = Math.floor(min.y / c), y1 = Math.floor(max.y / c);
    const z0 = Math.floor(min.z / c), z1 = Math.floor(max.z / c);
    const seen = this._seen || (this._seen = /* @__PURE__ */ new Set());
    seen.clear();
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          const arr = this.grid.get(x + "," + y + "," + z);
          if (!arr) continue;
          for (let i = 0; i < arr.length; i++) {
            const b = arr[i];
            if (seen.has(b)) continue;
            seen.add(b);
            out.push(b);
          }
        }
      }
    }
    return out;
  }
  // All contacts of a capsule (feet anchored at `pos`, total height `h`).
  capsuleContacts(pos, r, h, out) {
    out.length = 0;
    const min = _tmp.set(pos.x - r, pos.y - r * 0.5, pos.z - r);
    const max = new THREE.Vector3(pos.x + r, pos.y + h + r * 0.5, pos.z + r);
    const list = this._q1 || (this._q1 = []);
    this.queryBox(min, max, list);
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const wax = pos.x, way = pos.y + r, waz = pos.z;
      const wbx = pos.x, wby = pos.y + h - r, wbz = pos.z;
      _pa.set(wax, way, waz).sub(b.center).applyQuaternion(b.inv);
      _pb.set(wbx, wby, wbz).sub(b.center).applyQuaternion(b.inv);
      const d2 = closestOnSegmentToBox(_pa.x, _pa.y, _pa.z, _pb.x, _pb.y, _pb.z, b.half.x, b.half.y, b.half.z);
      const dist = Math.sqrt(d2);
      const pw = _pa.clone().applyQuaternion(b.quat).add(b.center);
      const qw = _q.clone().applyQuaternion(b.quat).add(b.center);
      if (dist > 1e-5) {
        _delta.copy(pw).sub(qw);
        const pen = r - dist;
        if (pen > -1e-4) out.push({ n: _delta.divideScalar(dist).clone(), pen, brush: b, point: qw.clone() });
      } else {
        const lx = b.half.x - Math.abs(_pa.x);
        const lyUp = b.half.y - _pa.y;
        const lyDown = b.half.y + _pa.y + 1e3;
        const ly = Math.min(lyUp, lyDown);
        const lz = b.half.z - Math.abs(_pa.z);
        let n;
        if (lx <= ly && lx <= lz) n = new THREE.Vector3(Math.sign(_pa.x) || 1, 0, 0);
        else if (ly <= lz) n = new THREE.Vector3(0, 1, 0);
        else n = new THREE.Vector3(0, 0, Math.sign(_pa.z) || 1);
        n.applyQuaternion(b.quat);
        _delta.copy(pw).sub(qw);
        const dir = dist > 1e-6 ? _delta.normalize() : n.clone();
        out.push({ n: dir, pen: r + Math.min(lx, ly, lz), brush: b, point: qw.clone() });
      }
    }
    return out;
  }
  penetrationOnly(pos, r, h) {
    const out = this._c1 || (this._c1 = []);
    this.capsuleContacts(pos, r, h, out);
    let worst = 0;
    for (const c of out) if (c.pen > worst) worst = c.pen;
    return worst;
  }
  // Ray vs world. Returns {dist, point, normal, brush} or null.
  raycast(ro, rd, maxDist = 500) {
    const end = new THREE.Vector3(ro.x + rd.x * maxDist, ro.y + rd.y * maxDist, ro.z + rd.z * maxDist);
    const min = new THREE.Vector3(Math.min(ro.x, end.x), Math.min(ro.y, end.y), Math.min(ro.z, end.z));
    const max = new THREE.Vector3(Math.max(ro.x, end.x), Math.max(ro.y, end.y), Math.max(ro.z, end.z));
    const list = this._q2 || (this._q2 = []);
    this.queryBox(min, max, list);
    let best = maxDist;
    let hit = null;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const o = _pa.copy(ro).sub(b.center).applyQuaternion(b.inv);
      const d = _pb.copy(rd).applyQuaternion(b.inv);
      let tmin = 0;
      let tmax = best;
      let axis = 0;
      let sign = 1;
      let ok = true;
      for (let a = 0; a < 3; a++) {
        const oo = a === 0 ? o.x : a === 1 ? o.y : o.z;
        const dd = a === 0 ? d.x : a === 1 ? d.y : d.z;
        const hh = a === 0 ? b.half.x : a === 1 ? b.half.y : b.half.z;
        if (Math.abs(dd) < 1e-8) {
          if (oo < -hh || oo > hh) {
            ok = false;
            break;
          }
        } else {
          const inv = 1 / dd;
          let t1 = (-hh - oo) * inv;
          let t2 = (hh - oo) * inv;
          let s = -1;
          if (t1 > t2) {
            const tt = t1;
            t1 = t2;
            t2 = tt;
            s = 1;
          }
          if (t1 > tmin) {
            tmin = t1;
            axis = a;
            sign = s;
          }
          if (t2 < tmax) tmax = t2;
          if (tmin > tmax) {
            ok = false;
            break;
          }
        }
      }
      if (!ok || tmin <= 1e-4 || tmin >= best) continue;
      best = tmin;
      const ln = new THREE.Vector3();
      if (axis === 0) ln.x = sign;
      else if (axis === 1) ln.y = sign;
      else ln.z = sign;
      hit = {
        dist: tmin,
        point: new THREE.Vector3(ro.x + rd.x * tmin, ro.y + rd.y * tmin, ro.z + rd.z * tmin),
        normal: ln.applyQuaternion(b.quat),
        brush: b
      };
    }
    return hit;
  }
  // Ray vs capsule (used for entity hit detection). a→b is the inner segment.
  static rayCapsule(ro, rd, a, b, r) {
    const ba = new THREE.Vector3().subVectors(b, a);
    const oa = new THREE.Vector3().subVectors(ro, a);
    const baba = ba.dot(ba);
    const bard = ba.dot(rd);
    const baoa = ba.dot(oa);
    const rdoa = rd.dot(oa);
    const oaoa = oa.dot(oa);
    let A = baba - bard * bard;
    let B2 = baba * rdoa - baoa * bard;
    let C = baba * oaoa - baoa * baoa - r * r * baba;
    let h = B2 * B2 - A * C;
    if (h >= 0 && Math.abs(A) > 1e-9) {
      const t = (-B2 - Math.sqrt(h)) / A;
      const y = baoa + t * bard;
      if (y > 0 && y < baba) return t > 0 ? t : 0;
      const oc = y <= 0 ? oa : new THREE.Vector3().subVectors(ro, b);
      B2 = rd.dot(oc);
      C = oc.dot(oc) - r * r;
      h = B2 * B2 - C;
      if (h > 0) {
        const t2 = -B2 - Math.sqrt(h);
        return t2 > 0 ? t2 : 0;
      }
      return null;
    }
    return null;
  }
};
var _nOut = new THREE.Vector3();
PhysicsWorld.prototype.deepestContact = function(pos, r, h, outNormal) {
  const list = this._q3 || (this._q3 = []);
  const min = new THREE.Vector3(pos.x - r, pos.y - r * 0.5, pos.z - r);
  const max = new THREE.Vector3(pos.x + r, pos.y + h + r * 0.5, pos.z + r);
  this.queryBox(min, max, list);
  let bestPen = 0;
  let bestN = null;
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    const wax = pos.x, way = pos.y + r, waz = pos.z;
    const wbx = pos.x, wby = pos.y + h - r, wbz = pos.z;
    _pa.set(wax, way, waz).sub(b.center).applyQuaternion(b.inv);
    _pb.set(wbx, wby, wbz).sub(b.center).applyQuaternion(b.inv);
    const d2 = closestOnSegmentToBox(_pa.x, _pa.y, _pa.z, _pb.x, _pb.y, _pb.z, b.half.x, b.half.y, b.half.z);
    const dist = Math.sqrt(d2);
    if (dist > 1e-5) {
      const pen = r - dist;
      if (pen <= 0) continue;
      const pw = _pa.clone().applyQuaternion(b.quat).add(b.center);
      const qw = _q.clone().applyQuaternion(b.quat).add(b.center);
      if (pen > bestPen) {
        bestPen = pen;
        bestN = _nOut.copy(pw).sub(qw).divideScalar(dist).clone();
      }
    } else {
      const lx = b.half.x - Math.abs(_pa.x);
      const lyUp = b.half.y - _pa.y;
      const lyDown = b.half.y + _pa.y + 1e3;
      const ly = Math.min(lyUp, lyDown);
      const lz = b.half.z - Math.abs(_pa.z);
      const pen = r + Math.min(lx, ly, lz);
      if (pen > bestPen) {
        bestPen = pen;
        const n = new THREE.Vector3();
        if (lx <= ly && lx <= lz) n.x = Math.sign(_pa.x) || 1;
        else if (ly <= lz) n.y = 1;
        else n.z = Math.sign(_pa.z) || 1;
        bestN = n.applyQuaternion(b.quat);
      }
    }
  }
  if (outNormal && bestN) outNormal.copy(bestN);
  return bestPen;
};
PhysicsWorld.prototype.overlaps = function(pos, r, h) {
  return this.deepestContact(pos, r, h, null) > 1e-3;
};

// src/game/core/Movement.js
var TUNE = {
  radius: 0.36,
  standHeight: 1.8,
  crouchHeight: 1.25,
  slideHeight: 0.95,
  gravity: 22,
  jumpVel: 7.75,
  jumpCutMul: 0.45,
  walkSpeed: 6.2,
  sprintSpeed: 10.2,
  crouchSpeed: 3.3,
  groundAccel: 9,
  // accel * wishSpeed * dt  (Quake style, responsive but never instant)
  airAccel: 26,
  airWishCap: 2.7,
  // air-strafe ceiling — turns + A/D make speed, W does not
  friction: 6.5,
  stopSpeed: 2.5,
  slideMinSpeed: 5,
  slideEndSpeed: 3.4,
  slideBoost: 1.4,
  slideFriction: 0.45,
  slideSteer: 4.2,
  // rad/s of carve authority while sliding
  slideHopBonus: 0.12,
  slideHopBonusMax: 0.9,
  slideCooldown: 0.18,
  jumpBuffer: 0.15,
  coyoteTime: 0.12,
  stepHeight: 0.52,
  groundSnap: 0.3,
  maxAirDragSpeed: 16,
  airDrag: 1.6,
  slideEye: 0.72,
  crouchEye: 1.05,
  standEye: 1.62
};
var _v = new THREE2.Vector3();
var _v2 = new THREE2.Vector3();
var _wish = new THREE2.Vector3();
var _n = new THREE2.Vector3();
var MovementController = class {
  constructor(world, opts = {}) {
    this.world = world;
    this.pos = new THREE2.Vector3(0, 2, 0);
    this.vel = new THREE2.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.height = TUNE.standHeight;
    this.targetHeight = TUNE.standHeight;
    this.radius = TUNE.radius;
    this.grounded = false;
    this.wasGrounded = false;
    this.groundNormal = new THREE2.Vector3(0, 1, 0);
    this.airTime = 0;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.sliding = false;
    this.crouching = false;
    this.sprinting = false;
    this.slideTime = 0;
    this.slideCooldown = 0;
    this.slideEntrySpeed = 0;
    this.slideHopTimer = 0;
    this.wallHit = false;
    this.headHit = false;
    this.landImpact = 0;
    this.lastFallSpeed = 0;
    this.lastLandSpeed = 0;
    this.speedMult = 1;
    this.time = 0;
    this.distance = 0;
    this.topSpeed = 0;
    this.events = [];
    this._throttle = {};
    this._contacts = [];
    this.tracker = new ChainTracker();
    this.inputCache = { forward: 0, right: 0, jump: false, crouch: false, sprint: false };
  }
  get horizontalSpeed() {
    return Math.hypot(this.vel.x, this.vel.z);
  }
  get speed() {
    return this.vel.length();
  }
  reset(pos, yaw = 0) {
    this.pos.copy(pos);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.height = this.targetHeight = TUNE.standHeight;
    this.grounded = false;
    this.wasGrounded = false;
    this.sliding = false;
    this.crouching = false;
    this.sprinting = false;
    this.airTime = 0;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.slideCooldown = 0;
    this.slideHopTimer = 0;
    this.time = 0;
    this.distance = 0;
    this.topSpeed = 0;
    this.events.length = 0;
    this._throttle = {};
  }
  emit(type, data = {}) {
    this.events.push({ type, t: this.time, ...data });
    if (this.events.length > 80) this.events.splice(0, this.events.length - 80);
    this.tracker.ingest(this.events);
  }
  emitEvery(type, gap, data = {}) {
    const last = this._throttle[type] || -99;
    if (this.time - last < gap) return;
    this._throttle[type] = this.time;
    this.emit(type, data);
  }
  // ── fixed-step simulation ─────────────────────────────────────────────────
  step(dt, input) {
    this.time += dt;
    this.inputCache = input;
    this.slideCooldown -= dt;
    this.jumpBuffer -= dt;
    this.slideHopTimer -= dt;
    this.coyote -= dt;
    if (input.jumpPressed) {
      this.jumpBuffer = TUNE.jumpBuffer;
      if (!this.grounded && this.coyote <= 0) this.emit("jumpBuffered");
    }
    if (!input.jump && this.jumpHeld && this.vel.y > 0) this.vel.y *= TUNE.jumpCutMul;
    this.jumpHeld = input.jump;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const f = input.forward, r = input.right;
    _wish.set(-sy * f + cy * r, 0, -cy * f - sy * r);
    const wl = _wish.length();
    if (wl > 1) _wish.multiplyScalar(1 / wl);
    const speed = this.horizontalSpeed;
    const wantCrouch = input.crouch;
    const canSprint = input.sprint && f > 0.1 && !this.sliding && !wantCrouch;
    if (canSprint && !this.sprinting && this.grounded) this.emit("sprintOn");
    this.sprinting = canSprint;
    if (input.crouchPressed && !this.sliding && this.slideCooldown <= 0 && this.grounded) {
      const fastEnough = speed > TUNE.slideMinSpeed || this.sprinting && speed > TUNE.walkSpeed * 0.75;
      if (fastEnough) this.startSlide();
    }
    if (this.sliding) {
      this.slideTime += dt;
      const tooSlow = this.horizontalSpeed < TUNE.slideEndSpeed && this.slideTime > 0.22;
      const gaveUp = !wantCrouch && this.slideTime > 0.3;
      const expired = tooSlow && this.slideTime > 1.6;
      if (!this.grounded || expired || gaveUp || tooSlow && !wantCrouch) this.endSlide();
    }
    if (this.sliding) {
      this.crouching = true;
      this.targetHeight = TUNE.slideHeight;
    } else if (this.crouching) {
      if (!wantCrouch) this.tryStand();
      this.targetHeight = this.crouching ? TUNE.crouchHeight : TUNE.standHeight;
    } else if (wantCrouch) {
      this.crouching = true;
      this.targetHeight = TUNE.crouchHeight;
    } else {
      this.targetHeight = TUNE.standHeight;
    }
    if (this.grounded) {
      this.coyote = TUNE.coyoteTime;
      this.airTime = 0;
      if (this.sliding) {
        this.slideMove(dt, _wish);
      } else {
        this.friction(dt, TUNE.friction, TUNE.stopSpeed);
        const target = (this.crouching ? TUNE.crouchSpeed : this.sprinting ? TUNE.sprintSpeed : TUNE.walkSpeed) * this.speedMult;
        this.accelerate(_wish, target, TUNE.groundAccel, dt);
      }
      this.vel.y -= TUNE.gravity * dt;
      const gn = this.groundNormal;
      const vn = this.vel.dot(gn);
      if (vn < 0) this.vel.addScaledVector(gn, -vn);
      if (gn.y < 0.985 && (this.sliding || this.sprinting)) {
        const nl = Math.hypot(gn.x, gn.z);
        if (nl > 0.01) {
          const dx = gn.x / nl, dz = gn.z / nl;
          if (this.vel.x * dx + this.vel.z * dz > 1.5) this.emitEvery("downhill", 0.4, { speed });
        }
      }
    } else {
      this.airTime += dt;
      if (this.wasGrounded) this.emit("leftGround");
      this.accelerate(_wish, TUNE.airWishCap, TUNE.airAccel, dt);
      this.vel.y -= TUNE.gravity * dt;
      const hs = this.horizontalSpeed;
      if (hs > TUNE.maxAirDragSpeed) {
        const k = Math.max(0, 1 - TUNE.airDrag * (hs - TUNE.maxAirDragSpeed) * dt);
        this.vel.x *= k;
        this.vel.z *= k;
      }
      if (Math.abs(r) > 0.1 && Math.abs(input.mouseDx || 0) > 0.4) {
        this.emitEvery("airstrafe", 0.18, { speed: hs });
      }
    }
    if (this.grounded && Math.abs(r) > 0.1 && !this.sliding) this.emitEvery("strafe", 0.3);
    if (this.jumpBuffer > 0 && (this.grounded || this.coyote > 0) && !this.headHit) {
      const viaCoyote = !this.grounded;
      this.jump();
      if (viaCoyote) this.emit("coyoteJump");
    }
    this.wasGrounded = this.grounded;
    this.moveAndCollide(dt);
    if (this.grounded && !this.wasGrounded) this.onLand();
    const s = this.horizontalSpeed;
    if (s > this.topSpeed) this.topSpeed = s;
    this.distance += s * dt;
  }
  // ── helpers ───────────────────────────────────────────────────────────────
  friction(dt, coeff, stopSpeed) {
    const speed = this.horizontalSpeed;
    if (speed < 1e-4) {
      this.vel.x = 0;
      this.vel.z = 0;
      return;
    }
    const drop = Math.max(speed, stopSpeed) * coeff * dt;
    const scale = Math.max(speed - drop, 0) / speed;
    this.vel.x *= scale;
    this.vel.z *= scale;
  }
  accelerate(wishDir, wishSpeed, accel, dt) {
    if (wishSpeed <= 0) return;
    const current = this.vel.x * wishDir.x + this.vel.z * wishDir.z;
    const add = wishSpeed - current;
    if (add <= 0) return;
    let a = accel * wishSpeed * dt;
    if (a > add) a = add;
    this.vel.x += wishDir.x * a;
    this.vel.z += wishDir.z * a;
  }
  slideMove(dt, wishDir) {
    const speed = this.horizontalSpeed;
    if (speed < 1e-4) return;
    const drop = Math.max(speed, 3) * TUNE.slideFriction * dt;
    const scale = Math.max(speed - drop, 0) / speed;
    this.vel.x *= scale;
    this.vel.z *= scale;
    const wl = Math.hypot(wishDir.x, wishDir.z);
    if (wl > 0.01 && this.horizontalSpeed > 0.4) {
      const sp = this.horizontalSpeed;
      const ca = (this.vel.x * wishDir.x + this.vel.z * wishDir.z) / (sp * wl);
      const cross = this.vel.x * wishDir.z - this.vel.z * wishDir.x;
      const angle = Math.atan2(cross / (sp * wl), ca);
      const maxTurn = TUNE.slideSteer * dt;
      const turn = clamp(angle, -maxTurn, maxTurn);
      const cs = Math.cos(turn), sn = Math.sin(turn);
      const vx = this.vel.x, vz = this.vel.z;
      this.vel.x = vx * cs - vz * sn;
      this.vel.z = vx * sn + vz * cs;
    }
  }
  startSlide() {
    const hs = this.horizontalSpeed;
    this.sliding = true;
    this.crouching = true;
    this.slideTime = 0;
    this.slideEntrySpeed = hs;
    this.targetHeight = TUNE.slideHeight;
    if (hs > 1e-3) {
      const k = TUNE.slideBoost / hs;
      this.vel.x += this.vel.x * k;
      this.vel.z += this.vel.z * k;
    }
    this.emit("slideStart", { speed: hs, downhill: this.groundNormal.y < 0.99 });
  }
  endSlide() {
    if (!this.sliding) return;
    this.sliding = false;
    this.slideCooldown = TUNE.slideCooldown;
    this.slideHopTimer = 0.5;
    if (!this.inputCache.crouch) this.tryStand();
    this.targetHeight = this.crouching ? TUNE.crouchHeight : TUNE.standHeight;
  }
  jump() {
    const hs = this.horizontalSpeed;
    if (this.sliding) {
      this.sliding = false;
      this.slideCooldown = TUNE.slideCooldown * 0.5;
      this.slideHopTimer = 0.75;
      if (hs > 6) {
        const bonus = clamp((hs - 6.5) * TUNE.slideHopBonus, 0, TUNE.slideHopBonusMax);
        const k = bonus / hs;
        this.vel.x += this.vel.x * k;
        this.vel.z += this.vel.z * k;
      }
      if (hs > 8.5) this.emit("fastSlideJump", { speed: hs });
      this.emit("slideJump", { speed: hs });
    } else {
      this.emit("jump", { speed: hs });
    }
    this.vel.y = TUNE.jumpVel;
    this.grounded = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.wasGrounded = false;
    this.targetHeight = this.crouching ? TUNE.crouchHeight : TUNE.standHeight;
    this.height = Math.min(this.height, TUNE.crouchHeight);
  }
  onLand() {
    this.landImpact = clamp(this.lastFallSpeed / 15, 0, 1.5);
    this.lastLandSpeed = this.horizontalSpeed;
    this.emit("land", { speed: this.horizontalSpeed, fall: this.lastFallSpeed });
    const hs = this.horizontalSpeed;
    if (this.slideCooldown <= 0 && (this.inputCache.crouch && hs > TUNE.slideMinSpeed || this.slideHopTimer > 0 && this.inputCache.crouch && hs > 3.8)) {
      this.startSlide();
    }
  }
  tryStand() {
    if (!this.crouching) return;
    if (!this.world.overlaps(this.pos, this.radius, TUNE.standHeight)) {
      this.crouching = false;
      this.targetHeight = TUNE.standHeight;
    } else {
      this.targetHeight = TUNE.crouchHeight;
    }
  }
  moveAndCollide(dt) {
    const r = this.radius;
    const entryVy = this.vel.y;
    const startX = this.pos.x, startY = this.pos.y, startZ = this.pos.z;
    const startVx = this.vel.x, startVz = this.vel.z;
    const disp = this.vel.length() * dt;
    const sub = Math.min(6, Math.max(1, Math.ceil(disp / (r * 0.6))));
    const sdt = dt / sub;
    let grounded = false;
    let gn = null;
    const hs0 = Math.hypot(startVx, startVz);
    this.wallHit = false;
    this.headHit = false;
    for (let s = 0; s < sub; s++) {
      this.pos.addScaledVector(this.vel, sdt);
      for (let it = 0; it < 6; it++) {
        const contacts = this.world.capsuleContacts(this.pos, r, this.height, this._contacts);
        if (!contacts.length) break;
        let deep = contacts[0];
        for (const c of contacts) if (c.pen > deep.pen) deep = c;
        const n = deep.n;
        this.pos.addScaledVector(n, deep.pen + 1e-4);
        const vn = this.vel.dot(n);
        if (vn < 0) this.vel.addScaledVector(n, -vn);
        if (n.y > 0.55) {
          grounded = true;
          gn = n;
        } else if (n.y < -0.5) this.headHit = true;
        else {
          this.wallHit = true;
          _n.copy(n);
        }
      }
    }
    const endSpeed = Math.hypot(this.vel.x, this.vel.z);
    const momentumEaten = hs0 > 1 && endSpeed < hs0 * 0.75;
    if (this.wasGrounded && (this.wallHit || momentumEaten)) {
      if (hs0 > 0.4) {
        const dx = startVx / hs0, dz = startVz / hs0;
        const probe = r * 0.85 + hs0 * dt;
        const tr = r * 0.88;
        for (let up = 0.08; up <= TUNE.stepHeight; up += 0.06) {
          const t = _v.set(startX + dx * probe, startY + up, startZ + dz * probe);
          if (this.world.overlaps(t, tr, this.height)) continue;
          let restY = null;
          let ny = 0;
          for (let d = 0; d <= up + 0.3; d += 0.03) {
            const p2 = _v2.copy(t);
            p2.y -= d;
            const pen = this.world.deepestContact(p2, r, this.height, _n);
            if (pen > 1e-3) {
              restY = p2.y + (d > 0 ? 0.03 : 0);
              ny = _n.y;
              break;
            }
          }
          if (restY === null || ny <= 0.55 || restY < startY - 0.06) continue;
          const p = _v2.set(t.x, restY, t.z);
          if (this.world.overlaps(p, r, this.height)) continue;
          this.pos.copy(p);
          this.vel.x = startVx;
          this.vel.z = startVz;
          this.vel.y = entryVy;
          grounded = true;
          gn = _n.clone();
          this.wallHit = false;
          break;
        }
      }
    }
    const flatLaunch = this.wasGrounded && this.groundNormal.y > 0.95 && this.vel.y < 3;
    if (!grounded && (this.vel.y <= 1.2 || flatLaunch)) {
      const snap = TUNE.groundSnap + Math.max(0, -this.vel.y) * dt;
      const test = _v.copy(this.pos);
      test.y -= snap;
      const pen = this.world.deepestContact(test, r, this.height, _n);
      if (pen > 0 && _n.y > 0.55 && pen <= snap + 0.03) {
        this.pos.copy(test).addScaledVector(_n, pen + 1e-4);
        grounded = true;
        gn = _n.clone();
        const vn = this.vel.dot(gn);
        if (vn < 0) this.vel.addScaledVector(gn, -vn);
        else if (gn.y > 0.95 && this.vel.y > 0) this.vel.y = 0;
        for (let it = 0; it < 3; it++) {
          const cs = this.world.capsuleContacts(this.pos, r, this.height, this._contacts);
          if (!cs.length) break;
          let deep = cs[0];
          for (const c of cs) if (c.pen > deep.pen) deep = c;
          this.pos.addScaledVector(deep.n, deep.pen + 1e-4);
          const v2 = this.vel.dot(deep.n);
          if (v2 < 0) this.vel.addScaledVector(deep.n, -v2);
        }
      }
    }
    const rate = 1 - Math.exp(-18 * dt);
    this.height += (this.targetHeight - this.height) * rate;
    if (Math.abs(this.height - this.targetHeight) < 0.01) this.height = this.targetHeight;
    this.grounded = grounded;
    this.lastFallSpeed = grounded ? Math.max(0, -entryVy) : Math.max(0, -this.vel.y);
    if (grounded && gn) this.groundNormal.copy(gn);
    else if (!grounded) this.groundNormal.set(0, 1, 0);
    if (grounded && this.vel.y < 0) this.vel.y = 0;
  }
  snapshot() {
    return {
      speed: this.horizontalSpeed,
      vert: this.vel.y,
      vel: this.vel.clone(),
      grounded: this.grounded,
      sliding: this.sliding,
      sprinting: this.sprinting,
      crouching: this.crouching,
      slope: this.groundNormal.y,
      height: this.height,
      pos: this.pos.clone(),
      top: this.topSpeed,
      chains: this.tracker.progress()
    };
  }
};
var CHAINS = [
  { id: 1, name: "SPRINT \u2192 SLIDE", seq: ["sprintOn", "slideStart"] },
  { id: 2, name: "SPRINT \u2192 SLIDE \u2192 JUMP", seq: ["sprintOn", "slideStart", "slideJump"] },
  { id: 3, name: "SPRINT \u2192 JUMP \u2192 AIR STRAFE", seq: ["sprintOn", "jump", "airstrafe"] },
  { id: 4, name: "SPRINT \u2192 SLIDE \u2192 JUMP \u2192 AIR STRAFE \u2192 LAND \u2192 SLIDE", seq: ["sprintOn", "slideStart", "slideJump", "airstrafe", "land", "slideStart"] },
  { id: 5, name: "DOWNHILL SPRINT \u2192 SLIDE", seq: ["downhill", "slideStart"] },
  { id: 6, name: "HIGH-SPEED SLIDE \u2192 JUMP", seq: ["slideStart", "fastSlideJump"] },
  { id: 7, name: "STRAFE \u2192 JUMP \u2192 AIR STRAFE \u2192 LAND", seq: ["strafe", "jump", "airstrafe", "land"] },
  { id: 8, name: "JUMP BUFFER \u2192 LAND \u2192 JUMP", seq: ["jumpBuffered", "land", "jump"] },
  { id: 9, name: "COYOTE TIME \u2192 JUMP", seq: ["leftGround", "coyoteJump"] }
];
var ChainTracker = class {
  constructor() {
    this.done = {};
    this.order = [];
    this.maxGap = 1.5;
  }
  ingest(events) {
    const last = events[events.length - 1];
    if (!last) return;
    for (const c of CHAINS) {
      if (this.done[c.id]) continue;
      if (last.type !== c.seq[c.seq.length - 1]) continue;
      const found = [];
      let ei = events.length - 1;
      let ok = true;
      for (let s = c.seq.length - 1; s >= 0; s--) {
        let j = ei;
        while (j >= 0 && events[j].type !== c.seq[s]) j--;
        if (j < 0) {
          ok = false;
          break;
        }
        found.push(events[j]);
        ei = j - 1;
      }
      if (!ok) continue;
      found.reverse();
      for (let k = 1; k < found.length; k++) {
        if (found[k].t - found[k - 1].t > this.maxGap) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      this.done[c.id] = true;
      this.order.push(c.id);
    }
  }
  progress() {
    return { done: this.done, count: this.order.length, total: CHAINS.length };
  }
};

// src/ui/HUD.jsx
var f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
function HUD({ hud, paused, needsLock, onResume, onQuit, showMv, mapName, mode }) {
  if (!hud) return null;
  const gap = Math.min(26, 3 + (hud.spread || 0) * 2.6);
  const spd = hud.speed || 0;
  const pct = Math.min(100, spd / 18 * 100);
  const low = hud.hp / hud.maxHp < 0.34;
  const chains = hud.chains?.done || {};
  return /* @__PURE__ */ React7.createElement("div", { className: "hud" }, /* @__PURE__ */ React7.createElement("div", { className: "vig" }), /* @__PURE__ */ React7.createElement("div", { className: "dmg", style: { opacity: hud.damageFlash * 0.9 } }), low && hud.alive && /* @__PURE__ */ React7.createElement("div", { className: "lowhp", style: { opacity: 0.5 + Math.sin(Date.now() / 260) * 0.25 } }), /* @__PURE__ */ React7.createElement("div", { className: "flash", style: { opacity: Math.min(0.92, (hud.flashTime || 0) * 0.6) } }), /* @__PURE__ */ React7.createElement("div", { className: "center cross", style: { opacity: hud.ads > 0.9 ? 0 : 1 } }, /* @__PURE__ */ React7.createElement("i", { className: "d", style: { width: 2 + (hud.reloading ? 0 : 1) } }), /* @__PURE__ */ React7.createElement("i", { style: { left: 21, top: 21 - gap - 4, width: 2, height: 5 } }), /* @__PURE__ */ React7.createElement("i", { style: { left: 21, top: 21 + gap, width: 2, height: 5 } }), /* @__PURE__ */ React7.createElement("i", { style: { left: 21 - gap - 4, top: 21, width: 5, height: 2 } }), /* @__PURE__ */ React7.createElement("i", { style: { left: 21 + gap, top: 21, width: 5, height: 2 } }), /* @__PURE__ */ React7.createElement("div", { className: `hm ${hud.hitmarker > 0 ? "on" : ""} ${hud.hitmarker > 0 && hud.headshot ? "hs" : ""}` }, /* @__PURE__ */ React7.createElement("i", null), /* @__PURE__ */ React7.createElement("i", null), /* @__PURE__ */ React7.createElement("i", null), /* @__PURE__ */ React7.createElement("i", null))), /* @__PURE__ */ React7.createElement("div", { className: "center dmgring" }, (hud.hitDirs || []).map((h) => /* @__PURE__ */ React7.createElement("div", { key: h.id, className: "dmga", style: { transform: `rotate(${h.ang * 57.2958}deg)`, opacity: Math.min(1, h.t / 0.9) } }, /* @__PURE__ */ React7.createElement("i", null)))), /* @__PURE__ */ React7.createElement("div", { className: "banners" }, (hud.banners || []).map((b) => /* @__PURE__ */ React7.createElement("div", { key: b.id, className: `bann ${b.kind || "info"}`, style: { opacity: Math.min(1, b.t / 0.45) } }, b.text))), showMv && /* @__PURE__ */ React7.createElement("div", { className: "panel mv" }, /* @__PURE__ */ React7.createElement("div", { className: "t" }, "MOVEMENT TELEMETRY"), /* @__PURE__ */ React7.createElement("div", { className: "big" }, f1(spd), /* @__PURE__ */ React7.createElement("small", null, "M/S"), /* @__PURE__ */ React7.createElement("span", { style: { float: "right", fontSize: 12, color: "var(--dim)" } }, "TOP ", f1(hud.topSpeed || 0))), /* @__PURE__ */ React7.createElement("div", { className: "spdbar" }, /* @__PURE__ */ React7.createElement("i", { style: { width: pct + "%" } }), /* @__PURE__ */ React7.createElement("u", { style: { left: "56%" } })), /* @__PURE__ */ React7.createElement("div", { className: "l" }, /* @__PURE__ */ React7.createElement("span", null, "VELOCITY XZ"), /* @__PURE__ */ React7.createElement("b", null, f1(Math.hypot(hud.vel?.x || 0, hud.vel?.z || 0)))), /* @__PURE__ */ React7.createElement("div", { className: "l" }, /* @__PURE__ */ React7.createElement("span", null, "VELOCITY Y"), /* @__PURE__ */ React7.createElement("b", null, f1(hud.vert || 0))), /* @__PURE__ */ React7.createElement("div", { className: "l" }, /* @__PURE__ */ React7.createElement("span", null, "STATE"), /* @__PURE__ */ React7.createElement("b", { className: "on" }, hud.grounded ? hud.sliding ? "SLIDING" : "GROUND" : "AIR")), /* @__PURE__ */ React7.createElement("div", { className: "l" }, /* @__PURE__ */ React7.createElement("span", null, "SLOPE"), /* @__PURE__ */ React7.createElement("b", null, (Math.acos(Math.min(1, hud.slope || 1)) * 57.3).toFixed(0), "\xB0")), /* @__PURE__ */ React7.createElement("div", { className: "pills" }, /* @__PURE__ */ React7.createElement("span", { className: `pill ${hud.sprinting ? "on" : ""}` }, "SPRINT"), /* @__PURE__ */ React7.createElement("span", { className: `pill ${hud.sliding ? "on" : ""}` }, "SLIDE"), /* @__PURE__ */ React7.createElement("span", { className: `pill ${hud.crouching ? "on" : ""}` }, "CROUCH"), /* @__PURE__ */ React7.createElement("span", { className: `pill ${!hud.grounded ? "on" : ""}` }, "AIR"), /* @__PURE__ */ React7.createElement("span", { className: `pill ${hud.haste ? "on" : ""}` }, "HASTE")), /* @__PURE__ */ React7.createElement("div", { className: "t", style: { marginTop: 10 } }, "CHAINS ", hud.chains?.count || 0, "/", CHAINS.length), /* @__PURE__ */ React7.createElement("div", { className: "chainrow" }, CHAINS.map((c) => /* @__PURE__ */ React7.createElement("i", { key: c.id, className: chains[c.id] ? "on" : "", title: c.name }))), /* @__PURE__ */ React7.createElement("div", { style: { marginTop: 6, fontSize: 9.5, color: "var(--dim2)", lineHeight: 1.5, minHeight: 26 } }, CHAINS.filter((c) => !chains[c.id])[0]?.name || "ALL CHAINS CLEAN")), /* @__PURE__ */ React7.createElement("div", { className: "panel hp" }, hud.spawnGuard > 0 && /* @__PURE__ */ React7.createElement("div", { className: "shield" }, "SPAWN SHIELD ", hud.spawnGuard.toFixed(1), "s"), /* @__PURE__ */ React7.createElement("div", { className: "n", style: { color: low ? "var(--rd)" : "#fff" } }, hud.hp, /* @__PURE__ */ React7.createElement("small", null, " / ", hud.maxHp, " HP")), /* @__PURE__ */ React7.createElement("div", { className: `hpbar ${low ? "low" : ""}` }, /* @__PURE__ */ React7.createElement("i", { style: { width: hud.hp / hud.maxHp * 100 + "%" } })), /* @__PURE__ */ React7.createElement("div", { style: { marginTop: 6, fontSize: 10, color: "var(--dim)", letterSpacing: ".1em" } }, mapName, " \xB7 ", String(mode).replace("_", " "))), /* @__PURE__ */ React7.createElement("div", { className: "panel ammo" }, /* @__PURE__ */ React7.createElement("div", { className: "w" }, hud.weapon), /* @__PURE__ */ React7.createElement("div", { className: "n" }, hud.ammo, /* @__PURE__ */ React7.createElement("span", null, " / ", hud.reserve)), hud.reloading && /* @__PURE__ */ React7.createElement("div", { className: "reload", style: { position: "static", marginTop: 6, width: "100%" } }, /* @__PURE__ */ React7.createElement("i", { style: { width: hud.reloadProgress * 100 + "%" } })), hud.ammo !== "\u221E" && hud.ammo === 0 && !hud.reloading && /* @__PURE__ */ React7.createElement("div", { style: { color: "var(--rd)", fontSize: 11, letterSpacing: ".2em" } }, "PRESS R")), /* @__PURE__ */ React7.createElement("div", { className: "panel util" }, "[F] ", hud.utility?.name, " ", /* @__PURE__ */ React7.createElement("b", null, "\xD7", hud.utility?.uses)), spd > 5 && /* @__PURE__ */ React7.createElement("div", { className: "momentum" }, "MOMENTUM DAMAGE \xD7", hud.momentum.toFixed(2)), hud.net && /* @__PURE__ */ React7.createElement("div", { className: "netind" }, /* @__PURE__ */ React7.createElement("b", { style: { color: hud.net.state === "open" ? "var(--gr)" : "var(--rd)" } }, "\u25CF"), hud.net.role === "host" ? "HOST" : "GUEST", " \xB7 ", hud.net.ping, "ms", hud.net.peer && /* @__PURE__ */ React7.createElement("span", null, " \xB7 VS ", hud.net.peer)), /* @__PURE__ */ React7.createElement("div", { className: "score" }, /* @__PURE__ */ React7.createElement("span", { className: "r" }, "ROUND ", hud.round?.round), /* @__PURE__ */ React7.createElement("span", { className: "a" }, hud.round?.scoreA), /* @__PURE__ */ React7.createElement("span", { style: { color: "var(--dim)" } }, ":"), /* @__PURE__ */ React7.createElement("span", { className: "b" }, hud.round?.scoreB), /* @__PURE__ */ React7.createElement("span", { className: "r", style: hud.matchPoint ? { color: "var(--gd)", fontWeight: 700 } : void 0 }, hud.matchPoint ? "MATCH POINT" : "FIRST TO 5")), /* @__PURE__ */ React7.createElement("div", { className: "kf" }, (hud.killfeed || []).slice(-5).map((k) => /* @__PURE__ */ React7.createElement("div", { key: k.id, className: `kfi ${k.mine ? "mine" : ""}` }, /* @__PURE__ */ React7.createElement("b", { style: { color: k.mine ? "var(--cy)" : "var(--txt)" } }, k.killer), /* @__PURE__ */ React7.createElement("span", { style: { color: "var(--dim)" } }, " ", k.head ? "\u2316" : "\u203A", " "), /* @__PURE__ */ React7.createElement("b", null, k.victim), k.weapon && /* @__PURE__ */ React7.createElement("i", { style: { color: "var(--dim2)", fontStyle: "normal", marginLeft: 6 } }, k.weapon)))), hud.round?.phase === "countdown" && /* @__PURE__ */ React7.createElement("div", { className: "banner", style: { color: "var(--cy)" } }, "ROUND ", hud.round.round, /* @__PURE__ */ React7.createElement("small", null, Math.ceil(hud.round.timer))), !hud.alive && hud.round?.phase === "live" && /* @__PURE__ */ React7.createElement("div", { className: "banner lose", style: { fontSize: 22 } }, "ELIMINATED", /* @__PURE__ */ React7.createElement("small", null, hud.spectating ? `SPECTATING \u2014 ${hud.spectating} \xB7 ${Math.ceil(hud.respawnTimer || 0)}s` : `${Math.ceil(hud.respawnTimer || 0)}s`)), hud.round?.phase === "roundend" && /* @__PURE__ */ React7.createElement("div", { className: `banner ${hud.round.scoreA > hud.round.scoreB ? "win" : "lose"}` }, hud.lastWin ? "ROUND WON" : hud.lastWin === false ? "ROUND LOST" : "ROUND OVER", /* @__PURE__ */ React7.createElement("small", null, hud.round.scoreA, " \u2014 ", hud.round.scoreB)), hud.scoreboard && hud.board && /* @__PURE__ */ React7.createElement("div", { className: "board" }, /* @__PURE__ */ React7.createElement("div", { className: "bh" }, /* @__PURE__ */ React7.createElement("span", null, mapName, " \xB7 ", String(mode).replace("_", " "), " \xB7 ", hud.ping, "ms"), /* @__PURE__ */ React7.createElement("span", { className: "cy" }, hud.round?.scoreA, " \u2014 ", hud.round?.scoreB), /* @__PURE__ */ React7.createElement("span", null, "FIRST TO 5 \xB7 ROUND ", hud.round?.round)), ["a", "b"].map((t) => /* @__PURE__ */ React7.createElement("div", { key: t, className: `bteam ${t}` }, /* @__PURE__ */ React7.createElement("div", { className: "bt" }, t === "a" ? "YOUR TEAM" : "ENEMY"), hud.board.filter((r) => r.team === t).sort((x, y) => y.kills - x.kills).map((r) => /* @__PURE__ */ React7.createElement("div", { key: r.name, className: `br ${r.you ? "you" : ""} ${r.alive ? "" : "dead"}` }, /* @__PURE__ */ React7.createElement("span", { className: "bn" }, r.name, /* @__PURE__ */ React7.createElement("i", { className: "bw" }, r.weapon)), /* @__PURE__ */ React7.createElement("span", { className: "bk" }, r.kills), /* @__PURE__ */ React7.createElement("span", { className: "bd" }, r.deaths), /* @__PURE__ */ React7.createElement("span", { className: "ba" }, r.assists), /* @__PURE__ */ React7.createElement("span", { className: "bm" }, r.damage))))), /* @__PURE__ */ React7.createElement("div", { className: "bf" }, /* @__PURE__ */ React7.createElement("span", null, "NAME"), /* @__PURE__ */ React7.createElement("span", null, "K"), /* @__PURE__ */ React7.createElement("span", null, "D"), /* @__PURE__ */ React7.createElement("span", null, "A"), /* @__PURE__ */ React7.createElement("span", null, "DMG"))), paused && /* @__PURE__ */ React7.createElement("div", { className: "pause" }, /* @__PURE__ */ React7.createElement("h2", null, needsLock ? "CLICK TO PLAY" : "PAUSED"), needsLock && /* @__PURE__ */ React7.createElement("div", { className: "hint", style: { textAlign: "center", maxWidth: 460, marginBottom: 10 } }, "Click the arena to capture your mouse. Mouse look, shooting and movement all live behind the pointer lock \u2014 press ", /* @__PURE__ */ React7.createElement("span", { className: "kbd" }, "ESC"), " to release it."), /* @__PURE__ */ React7.createElement("div", { className: "hint", style: { textAlign: "center", maxWidth: 460, marginBottom: 10 } }, /* @__PURE__ */ React7.createElement("span", { className: "kbd" }, "W"), /* @__PURE__ */ React7.createElement("span", { className: "kbd" }, "A"), /* @__PURE__ */ React7.createElement("span", { className: "kbd" }, "S"), /* @__PURE__ */ React7.createElement("span", { className: "kbd" }, "D"), " move \xB7 ", /* @__PURE__ */ React7.createElement("span", { className: "kbd" }, "SHIFT"), " sprint \xB7 ", /* @__PURE__ */ React7.createElement("span", { className: "kbd" }, "CTRL"), " slide/crouch \xB7 ", /* @__PURE__ */ React7.createElement("span", { className: "kbd" }, "SPACE"), " jump \xB7 ", /* @__PURE__ */ React7.createElement("span", { className: "kbd" }, "RMB"), " aim \xB7 ", /* @__PURE__ */ React7.createElement("span", { className: "kbd" }, "F"), " utility \xB7 ", /* @__PURE__ */ React7.createElement("span", { className: "kbd" }, "1"), /* @__PURE__ */ React7.createElement("span", { className: "kbd" }, "2"), /* @__PURE__ */ React7.createElement("span", { className: "kbd" }, "3"), " weapons \xB7 ", /* @__PURE__ */ React7.createElement("span", { className: "kbd" }, "R"), " reload"), /* @__PURE__ */ React7.createElement("div", { className: "row" }, /* @__PURE__ */ React7.createElement("button", { className: "btn pri", onClick: onResume }, needsLock ? "CLICK TO PLAY" : "RESUME"), /* @__PURE__ */ React7.createElement("button", { className: "btn", onClick: onQuit }, "LEAVE MATCH"))));
}

// src/ui/Loadout.jsx
import React8, { useState as useState4, useEffect, useMemo } from "react";

// src/game/data/names.js
var BOT_NAMES = [
  "VEXA",
  "K0RR",
  "NILL",
  "ZEPH",
  "ORYX",
  "SABLE",
  "MOTH",
  "QUEN",
  "DRIFT",
  "HALO",
  "RUIN",
  "ONYX",
  "PYRE",
  "AXIS",
  "NOVA",
  "GLOOM"
];
var BOT_TAGS = ["", "\xB2", "\xB3", ".exe", "_", "-7", "//"];
function rollName(pool = BOT_NAMES) {
  const n = pool[Math.floor(Math.random() * pool.length)];
  const t = BOT_TAGS[Math.floor(Math.random() * BOT_TAGS.length)];
  return n + t;
}
function rollPing() {
  return 12 + Math.floor(Math.random() * 68);
}

// src/ui/Loadout.jsx
function WeaponCard({ w, owned, equipped, onPick, onBuy, qyns }) {
  const r = RARITY[w.rarity];
  return /* @__PURE__ */ React8.createElement("div", { className: `card ${equipped ? "on" : ""} ${owned ? "" : "locked"}`, onClick: () => owned ? onPick(w) : onBuy(w) }, /* @__PURE__ */ React8.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 } }, /* @__PURE__ */ React8.createElement("div", { className: "nm", style: { color: r.color } }, w.name), /* @__PURE__ */ React8.createElement("span", { className: "tag", style: { color: r.color } }, r.label)), /* @__PURE__ */ React8.createElement("div", { className: "ds" }, w.desc), /* @__PURE__ */ React8.createElement("div", { className: "stats4" }, w.slot !== "utility" && /* @__PURE__ */ React8.createElement(React8.Fragment, null, /* @__PURE__ */ React8.createElement("div", null, /* @__PURE__ */ React8.createElement("span", null, "DMG"), /* @__PURE__ */ React8.createElement("b", null, w.stats.dmg)), /* @__PURE__ */ React8.createElement("div", null, /* @__PURE__ */ React8.createElement("span", null, "RPM"), /* @__PURE__ */ React8.createElement("b", null, w.stats.rpm)), /* @__PURE__ */ React8.createElement("div", null, /* @__PURE__ */ React8.createElement("span", null, "MAG"), /* @__PURE__ */ React8.createElement("b", null, w.stats.mag ?? "\u2014")), /* @__PURE__ */ React8.createElement("div", null, /* @__PURE__ */ React8.createElement("span", null, "SPD"), /* @__PURE__ */ React8.createElement("b", null, ((w.stats.speed ?? 1) * 100).toFixed(0), "%"))), w.slot === "utility" && /* @__PURE__ */ React8.createElement(React8.Fragment, null, /* @__PURE__ */ React8.createElement("div", null, /* @__PURE__ */ React8.createElement("span", null, "TYPE"), /* @__PURE__ */ React8.createElement("b", { style: { fontSize: 10 } }, String(w.stats.type).toUpperCase())), /* @__PURE__ */ React8.createElement("div", null, /* @__PURE__ */ React8.createElement("span", null, "USES"), /* @__PURE__ */ React8.createElement("b", null, w.stats.count)), /* @__PURE__ */ React8.createElement("div", null, /* @__PURE__ */ React8.createElement("span", null, "RAD"), /* @__PURE__ */ React8.createElement("b", null, w.stats.radius ?? "\u2014")), /* @__PURE__ */ React8.createElement("div", null, /* @__PURE__ */ React8.createElement("span", null, "DMG"), /* @__PURE__ */ React8.createElement("b", null, w.stats.dmg ?? "\u2014")))), /* @__PURE__ */ React8.createElement("div", { className: "mt" }, owned ? /* @__PURE__ */ React8.createElement("span", { className: "price own" }, equipped ? "EQUIPPED" : "OWNED") : /* @__PURE__ */ React8.createElement("span", { className: "price" }, w.qyns, " \u25C8 ", qyns < w.qyns ? "(NEED MORE)" : ""), /* @__PURE__ */ React8.createElement("span", null, w.slot.toUpperCase())));
}
function Loadout({ profile, onStart, onBack, mapId, mode, save, peerName }) {
  const [step, setStep] = useState4(0);
  const [loadout, setLoadout] = useState4({ ...profile.loadout });
  const [phase, setPhase] = useState4("pick");
  const [ready, setReady] = useState4([]);
  const map = MAPS.find((m) => m.id === mapId);
  const slot = SLOTS[step];
  const owned = (id) => profile.unlocked.includes(id);
  const teamSize = mode.teamA;
  const enemySize = mode.teamB;
  const bots = useMemo(() => Array.from({ length: teamSize + enemySize - 1 }, (_, i) => i), [teamSize, enemySize]);
  const roster = useMemo(() => {
    const pool = WEAPONS.filter((w) => w.slot === "primary");
    const mk = (team) => ({
      name: rollName(),
      ping: rollPing(),
      team,
      weapon: pool[Math.floor(Math.random() * pool.length)]
    });
    return {
      mates: Array.from({ length: Math.max(0, teamSize - 1) }, () => mk("a")),
      foes: Array.from({ length: enemySize }, () => mk("b"))
    };
  }, [teamSize, enemySize]);
  useEffect(() => {
    if (phase !== "waiting") return;
    let n = 0;
    const t = setInterval(() => {
      n++;
      setReady((r) => [...r, n]);
      if (n >= bots.length) {
        clearInterval(t);
        setTimeout(() => {
          setPhase("go");
          setTimeout(() => onStart(loadout), 700);
        }, 500);
      }
    }, 260 + Math.random() * 220);
    const bail = setTimeout(() => {
      if (phase === "waiting") onStart(loadout);
    }, 6e3);
    return () => {
      clearInterval(t);
      clearTimeout(bail);
    };
  }, [phase]);
  const lockIn = (next) => {
    const l = next || loadout;
    const p = { ...profile, loadout: l };
    save(p);
    setPhase("waiting");
  };
  const pick2 = (w) => {
    const next = { ...loadout, [slot.id]: w.id };
    setLoadout(next);
    if (step < SLOTS.length - 1) setStep(step + 1);
    else lockIn(next);
  };
  const readyUp = () => {
    if (phase === "pick") lockIn();
  };
  const buy = (w) => {
    if (profile.qyns < w.qyns) return;
    const p = { ...profile, qyns: profile.qyns - w.qyns, unlocked: [...profile.unlocked, w.id] };
    save(p);
  };
  if (phase !== "pick") {
    const row = (p, i, mine) => /* @__PURE__ */ React8.createElement("div", { key: i, className: `prow ${p.team === "a" ? "a" : "b"} ${mine ? "you" : ""} ${ready.includes(i + 1) || mine ? "rdy" : ""}` }, /* @__PURE__ */ React8.createElement("span", { className: "pdot" }), /* @__PURE__ */ React8.createElement("span", { className: "pnm" }, mine ? "YOU" : p.name), /* @__PURE__ */ React8.createElement("span", { className: "pwp" }, mine ? (WEAPON_MAP[loadout.primary] || {}).name : p.online ? "LINKED" : p.weapon?.name), /* @__PURE__ */ React8.createElement("span", { className: "ppg" }, mine ? "HOST" : p.online ? "P2P" : p.ping + "ms"), /* @__PURE__ */ React8.createElement("span", { className: "prd" }, ready.includes(i + 1) || mine ? "\u2713 READY" : p.online ? "CONNECTED" : "CHOOSING\u2026"));
    return /* @__PURE__ */ React8.createElement("div", { className: "screen" }, /* @__PURE__ */ React8.createElement("div", { className: "hero", style: { maxWidth: 760 } }, /* @__PURE__ */ React8.createElement("h1", { style: { fontSize: "clamp(34px,6vw,64px)" } }, phase === "go" ? "MATCH START" : "LOCKING IN"), /* @__PURE__ */ React8.createElement("p", null, map?.name, " \xB7 ", mode.name, " \xB7 FIRST TO 5 \xB7 150 HP"), /* @__PURE__ */ React8.createElement("div", { style: { display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", justifyContent: "center" } }, SLOTS.map((s) => /* @__PURE__ */ React8.createElement("div", { key: s.id, className: "chip", style: { flexDirection: "column", alignItems: "flex-start", gap: 3 } }, /* @__PURE__ */ React8.createElement("span", { style: { fontSize: 8.5, letterSpacing: ".2em", color: "var(--dim)" } }, s.name), /* @__PURE__ */ React8.createElement("b", { style: { color: "var(--cy)" } }, (WEAPON_MAP[loadout[s.id]] || {}).name)))), /* @__PURE__ */ React8.createElement("div", { className: "pboard" }, /* @__PURE__ */ React8.createElement("div", { className: "pteam" }, /* @__PURE__ */ React8.createElement("div", { className: "pth a" }, "YOUR TEAM"), row({ name: "YOU", team: "a" }, 0, true), roster.mates.map((p, i) => row(p, i + 1))), /* @__PURE__ */ React8.createElement("div", { className: "pteam" }, /* @__PURE__ */ React8.createElement("div", { className: "pth b" }, "ENEMY TEAM"), roster.foes.map((p, i) => row(p, i + 1 + roster.mates.length))))));
  }
  return /* @__PURE__ */ React8.createElement("div", { className: "screen" }, /* @__PURE__ */ React8.createElement("div", { className: "topbar" }, /* @__PURE__ */ React8.createElement("div", { className: "logo" }, "QynGun", /* @__PURE__ */ React8.createElement("small", null, "LOADOUT")), /* @__PURE__ */ React8.createElement("div", { className: "nav" }, SLOTS.map((s, i) => /* @__PURE__ */ React8.createElement("button", { key: s.id, className: i === step ? "on" : "", onClick: () => i <= step && setStep(i) }, i + 1, ". ", s.name))), /* @__PURE__ */ React8.createElement("div", { className: "wallet" }, /* @__PURE__ */ React8.createElement("div", { className: "chip" }, /* @__PURE__ */ React8.createElement("b", null, profile.qyns), " \u25C8 QYNS"), /* @__PURE__ */ React8.createElement("button", { className: "btn sm ghost", onClick: onBack }, "BACK"))), /* @__PURE__ */ React8.createElement("div", { className: "content" }, /* @__PURE__ */ React8.createElement("div", { className: "h" }, slot.name, " \u2014 ", slot.hint), /* @__PURE__ */ React8.createElement("div", { className: "grid", style: { gridTemplateColumns: "repeat(auto-fill,minmax(238px,1fr))" } }, bySlot(slot.id).map((w) => /* @__PURE__ */ React8.createElement(
    WeaponCard,
    {
      key: w.id,
      w,
      owned: owned(w.id),
      equipped: loadout[slot.id] === w.id,
      onPick: pick2,
      onBuy: buy,
      qyns: profile.qyns
    }
  ))), /* @__PURE__ */ React8.createElement("div", { style: { marginTop: 22, display: "flex", gap: 12, alignItems: "center" } }, step > 0 && /* @__PURE__ */ React8.createElement("button", { className: "btn ghost", onClick: () => setStep(step - 1) }, "\u25C0 ", SLOTS[step - 1].name), /* @__PURE__ */ React8.createElement("div", { className: "hint", style: { flex: 1 } }, "Slot ", step + 1, " of ", SLOTS.length, " \u2014 pick your ", /* @__PURE__ */ React8.createElement("b", { style: { color: "var(--cy)" } }, slot.name), ". Keys buy the rest in the Armory."), step === SLOTS.length - 1 ? /* @__PURE__ */ React8.createElement("button", { className: "btn pri", onClick: readyUp }, "START MATCH \u25B6") : /* @__PURE__ */ React8.createElement("button", { className: "btn pri", onClick: () => setStep(step + 1) }, "NEXT \u25B6"))));
}

// src/ui/Netplay.jsx
import React9, { useState as useState5, useEffect as useEffect2, useRef } from "react";

// src/game/net/Net.js
var ICE = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] }] };
var NAT_HINT = "Could not reach the other player. WebRTC punches through most home routers, but some networks block it (symmetric NAT, mobile data, strict VPNs). Try the same Wi-Fi, a different network, or turn off a VPN.";
var NET_OK = typeof window !== "undefined" && !!window.RTCPeerConnection;
var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function toB64url(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    out += B64[a >> 2];
    out += B64[(a & 3) << 4 | (b ?? 0) >> 4];
    if (b === void 0) break;
    out += B64[(b & 15) << 2 | (c ?? 0) >> 6];
    if (c === void 0) break;
    out += B64[c & 63];
  }
  return out;
}
function fromB64url(s) {
  const bytes = [];
  let buf = 0, bits = 0;
  for (const ch of s) {
    const v = B64.indexOf(ch);
    if (v < 0) continue;
    buf = buf << 6 | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push(buf >> bits & 255);
    }
  }
  return new Uint8Array(bytes);
}
async function pack(text) {
  const raw = new TextEncoder().encode(text);
  if (typeof CompressionStream !== "undefined") {
    try {
      const cs = new CompressionStream("deflate-raw");
      const buf = await new Response(new Blob([raw]).stream().pipeThrough(cs)).arrayBuffer();
      return "z" + toB64url(new Uint8Array(buf));
    } catch (e) {
    }
  }
  return "p" + toB64url(raw);
}
async function unpack(code) {
  const body = code.trim().replace(/^QYN\d\./, "");
  const bytes = fromB64url(body.slice(1));
  if (body[0] === "z") {
    if (typeof DecompressionStream === "undefined") throw new Error("This browser cannot read compressed codes \u2014 ask for a plain one.");
    const ds = new DecompressionStream("deflate-raw");
    const buf = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
    return new TextDecoder().decode(buf);
  }
  return new TextDecoder().decode(bytes);
}
var Net = class {
  constructor() {
    this.role = null;
    this.pc = null;
    this.chan = null;
    this.state = "idle";
    this.inbox = [];
    this.onState = () => {
    };
    this.ping = 0;
    this._pingT = 0;
    this._lastRecv = 0;
    this._deadline = 0;
    this.error = null;
  }
  get open() {
    return this.state === "open" && this.chan && this.chan.readyState === "open";
  }
  setState(s, err) {
    this.state = s;
    this.error = err || null;
    if (s === "offering" || s === "answering" || s === "connecting") this._armWatchdog();
    this.onState(s, this.error);
  }
  // If the two browsers can't punch through NAT there is nobody to tell us,
  // so give up with an honest message instead of spinning forever.
  _armWatchdog() {
    if (this._deadline && this._deadline !== -1) return;
    this._deadline = -1;
    setTimeout(() => {
      if (this.state === "open" || this.state === "closed") {
        this._deadline = 0;
        return;
      }
      this.setState("error", NAT_HINT);
    }, 25e3);
  }
  _attach(pc, chan) {
    this.pc = pc;
    this.chan = chan;
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (s === "failed") this.setState("error", NAT_HINT);
      else if (s === "disconnected" && this.state === "open") this.setState("connecting", "Link unstable \u2014 trying to recover\u2026");
      else if (s === "connected" && this.state === "connecting") {
        this.error = null;
        this.setState("connecting");
      } else if (s === "closed") this.setState("closed");
    };
    chan.onopen = () => {
      this._lastRecv = performance.now();
      this._pingT = 0;
      this._deadline = 0;
      this.setState("open");
    };
    chan.onclose = () => this.setState("closed");
    chan.onmessage = (e) => {
      this._lastRecv = performance.now();
      try {
        const msg = JSON.parse(e.data);
        if (msg[0] === "p") this.send(["q", msg[1]]);
        else if (msg[0] === "q") this.ping = Math.max(0, Math.round(performance.now() - msg[1]));
        else this.inbox.push(msg);
      } catch (err) {
      }
      if (this.inbox.length > 400) this.inbox.splice(0, 200);
    };
  }
  // Wait for ICE to finish so the code contains every candidate we have.
  _gathered(pc) {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === "complete") return resolve();
      let done = false;
      const fin = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === "complete") fin();
      };
      setTimeout(fin, 4e3);
    });
  }
  async host() {
    if (!NET_OK) throw new Error("WebRTC is not available in this browser.");
    this.role = "host";
    this.setState("offering");
    const pc = new RTCPeerConnection(ICE);
    const chan = pc.createDataChannel("qyngun", { ordered: false, maxRetransmits: 0 });
    this._attach(pc, chan);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await this._gathered(pc);
    return "QYN1." + await pack(JSON.stringify(pc.localDescription));
  }
  async join(code) {
    if (!NET_OK) throw new Error("WebRTC is not available in this browser.");
    this.role = "guest";
    this.setState("answering");
    const desc = JSON.parse(await unpack(code));
    const pc = new RTCPeerConnection(ICE);
    let chan = null;
    pc.ondatachannel = (e) => {
      chan = e.channel;
      this._attach(pc, chan);
    };
    await pc.setRemoteDescription(desc);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await this._gathered(pc);
    return "QYN2." + await pack(JSON.stringify(pc.localDescription));
  }
  async accept(code) {
    const desc = JSON.parse(await unpack(code));
    await this.pc.setRemoteDescription(desc);
    this.setState("connecting");
  }
  send(msg) {
    if (!this.open) return false;
    try {
      this.chan.send(JSON.stringify(msg));
      return true;
    } catch (e) {
      return false;
    }
  }
  // Drain everything received since the last call.
  receive() {
    const out = this.inbox;
    this.inbox = [];
    return out;
  }
  tick(dt) {
    if (!this.open) return;
    this._pingT -= dt;
    if (this._pingT <= 0) {
      this._pingT = 1;
      this.send(["p", performance.now()]);
    }
    if (this._lastRecv && performance.now() - this._lastRecv > 9e3) this.setState("error", "The other player stopped responding.");
  }
  close() {
    try {
      this.chan?.close();
    } catch (e) {
    }
    try {
      this.pc?.close();
    } catch (e) {
    }
    this.setState("closed");
  }
};
var MSG = {
  // 0:t 1..3 pos 4..6 vel 7 yaw 8 pitch 9 flags 10 hp 11 slot 12 ammo 13 speed
  snapshot: (t, mv, flags, hp, slot, ammo) => [
    "s",
    +t.toFixed(3),
    +mv.pos.x.toFixed(2),
    +mv.pos.y.toFixed(2),
    +mv.pos.z.toFixed(2),
    +mv.vel.x.toFixed(2),
    +mv.vel.y.toFixed(2),
    +mv.vel.z.toFixed(2),
    +mv.yaw.toFixed(3),
    +mv.pitch.toFixed(3),
    flags,
    Math.round(hp),
    slot,
    ammo | 0,
    +mv.horizontalSpeed.toFixed(2)
  ],
  damage: (amount, head, hpLeft) => ["d", Math.round(amount), head ? 1 : 0, Math.round(hpLeft)],
  kill: (killer, victim, head, weapon) => ["k", killer, victim, head ? 1 : 0, weapon],
  shot: (x, y, z, dx, dy, dz, weapon) => ["f", +x.toFixed(2), +y.toFixed(2), +z.toFixed(2), +dx.toFixed(3), +dy.toFixed(3), +dz.toFixed(3), weapon],
  hit: (x, y, z) => ["i", +x.toFixed(2), +y.toFixed(2), +z.toFixed(2)],
  match: (phase, round, scoreA, scoreB, timer) => ["m", phase, round, scoreA, scoreB, +timer.toFixed(2)],
  hello: (name, loadout, skin) => ["l", name, loadout, skin],
  ready: (mapId, modeId) => ["y", mapId, modeId],
  spawn: (index) => ["r", index],
  bye: () => ["x"]
};
var FLAG = { grounded: 1, sliding: 2, sprinting: 4, crouching: 8, alive: 16, firing: 32, reloading: 64 };

// src/ui/Netplay.jsx
function Netplay({ profile, onConnected, onBack }) {
  const [role, setRole] = useState5(null);
  const [step, setStep] = useState5(0);
  const [code, setCode] = useState5("");
  const [input, setInput] = useState5("");
  const [status, setStatus] = useState5("");
  const [bad, setBad] = useState5(false);
  const [mapId, setMapId] = useState5("vertex");
  const [name, setName] = useState5(profile.name || "");
  const netRef = useRef(null);
  useEffect2(() => () => {
    netRef.current?.close();
    netRef.current = null;
  }, []);
  const say = (m, isBad) => {
    setStatus(m);
    setBad(!!isBad);
  };
  const makeNet = () => {
    if (!NET_OK) {
      say("WebRTC is not available in this browser. Try Chrome, Edge, Firefox or Safari.", true);
      return null;
    }
    const n = new Net();
    n.onState = (s, err) => {
      if (s === "open") {
        setStep(3);
        if (n.role === "host") {
          say("CONNECTED \u2014 entering the lobby\u2026");
          setTimeout(() => onConnected(n, { role: "host", mapId, name: name.trim() || "HOST" }), 400);
        } else {
          say("CONNECTED \u2014 waiting for the host to pick the arena\u2026");
          const iv = setInterval(() => {
            for (const m of n.receive()) {
              if (m[0] === "y") {
                clearInterval.done = true;
                clearInterval(iv);
                const mid = MAPS.some((mm) => mm.id === m[1]) ? m[1] : mapId;
                setMapId(mid);
                say("Arena locked in: " + (MAPS.find((mm) => mm.id === mid)?.name || mid));
                setTimeout(() => onConnected(n, { role: "guest", mapId: mid, name: name.trim() || "GUEST" }), 400);
              }
            }
          }, 120);
          setTimeout(() => {
            if (!clearInterval.done) {
              clearInterval(iv);
              clearInterval.done = true;
              say("No arena word from the host \u2014 loading yours.", true);
              setTimeout(() => onConnected(n, { role: "guest", mapId, name: name.trim() || "GUEST" }), 500);
            }
          }, 15e3);
        }
      } else if (s === "error") say(err || "Connection failed.", true);
      else if (s === "closed") say("Connection closed.");
    };
    netRef.current = n;
    return n;
  };
  const create = async () => {
    const n = makeNet();
    if (!n) return;
    say("Building your invite code\u2026");
    try {
      const c = await n.host();
      setCode(c);
      setStep(1);
      say("Send this code to your friend, then paste theirs below.");
    } catch (e) {
      say(e.message || "Could not create the room.", true);
    }
  };
  const join = async () => {
    if (!input.trim()) return say("Paste the host code first.", true);
    const n = makeNet();
    if (!n) return;
    say("Reading the invite\u2026");
    try {
      const c = await n.join(input.trim());
      setCode(c);
      setStep(2);
      say("Send this code back to the host. Waiting for them to accept\u2026");
    } catch (e) {
      say(e.message || "That code did not parse.", true);
    }
  };
  const accept = async () => {
    if (!input.trim() || !netRef.current) return say("Paste their answer code first.", true);
    say("Connecting\u2026");
    try {
      await netRef.current.accept(input.trim());
    } catch (e) {
      say(e.message || "That answer code did not parse.", true);
    }
  };
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      say("Copied to clipboard.");
    } catch (e) {
      say("Select the text and copy it manually.");
    }
  };
  const box = (value, readOnly) => /* @__PURE__ */ React9.createElement(
    "textarea",
    {
      className: "codebox",
      readOnly,
      value,
      onChange: (e) => setInput(e.target.value),
      placeholder: readOnly ? "" : "paste the code here\u2026",
      spellCheck: false
    }
  );
  return /* @__PURE__ */ React9.createElement("div", { className: "screen" }, /* @__PURE__ */ React9.createElement("div", { className: "topbar" }, /* @__PURE__ */ React9.createElement("div", { className: "logo" }, "QynGun", /* @__PURE__ */ React9.createElement("small", null, "ONLINE DUEL")), /* @__PURE__ */ React9.createElement("div", { className: "wallet" }, /* @__PURE__ */ React9.createElement("button", { className: "btn sm ghost", onClick: onBack }, "\u25C0 LOBBY"))), /* @__PURE__ */ React9.createElement("div", { className: "content", style: { maxWidth: 820 } }, /* @__PURE__ */ React9.createElement("div", { className: "h" }, "PEER TO PEER \u2014 NO SERVER, NO ACCOUNT"), /* @__PURE__ */ React9.createElement("div", { className: "hint", style: { marginBottom: 18 } }, "QynGun links you straight to the other player. One of you hosts, you swap two codes (Discord, chat, anything) and the duel runs browser to browser. Both players keep their own movement, and whoever shoots decides the hit \u2014 there is no server to argue with."), /* @__PURE__ */ React9.createElement("div", { className: "row", style: { marginBottom: 16 } }, /* @__PURE__ */ React9.createElement(
    "input",
    {
      className: "sel",
      style: { maxWidth: 220 },
      value: name,
      placeholder: "YOUR NAME",
      onChange: (e) => setName(e.target.value.slice(0, 14))
    }
  ), role !== "guest" && /* @__PURE__ */ React9.createElement("select", { className: "sel", style: { maxWidth: 240 }, value: mapId, onChange: (e) => setMapId(e.target.value) }, MAPS.filter((m) => m.modes.includes("1v1")).map((m) => /* @__PURE__ */ React9.createElement("option", { key: m.id, value: m.id }, m.name))), role === "guest" && /* @__PURE__ */ React9.createElement("div", { className: "hint" }, "The host picks the arena \u2014 you will drop in automatically.")), !role && /* @__PURE__ */ React9.createElement("div", { className: "grid", style: { gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" } }, /* @__PURE__ */ React9.createElement("div", { className: "card", onClick: () => {
    setRole("host");
    setStep(0);
    setInput("");
  } }, /* @__PURE__ */ React9.createElement("div", { className: "nm" }, "HOST A DUEL"), /* @__PURE__ */ React9.createElement("div", { className: "ds" }, "You create the room, pick the map, and hand your friend one code. You own the round clock."), /* @__PURE__ */ React9.createElement("div", { className: "mt" }, /* @__PURE__ */ React9.createElement("span", null, "1 v 1"), /* @__PURE__ */ React9.createElement("span", { style: { color: "var(--cy)" } }, "CREATE \u25B6"))), /* @__PURE__ */ React9.createElement("div", { className: "card", onClick: () => {
    setRole("guest");
    setStep(0);
    setInput("");
  } }, /* @__PURE__ */ React9.createElement("div", { className: "nm" }, "JOIN A DUEL"), /* @__PURE__ */ React9.createElement("div", { className: "ds" }, "Paste the code your friend sent you, then send the answer code back."), /* @__PURE__ */ React9.createElement("div", { className: "mt" }, /* @__PURE__ */ React9.createElement("span", null, "1 v 1"), /* @__PURE__ */ React9.createElement("span", { style: { color: "var(--cy)" } }, "JOIN \u25B6")))), role === "host" && /* @__PURE__ */ React9.createElement("div", { className: "panel", style: { padding: 18 } }, /* @__PURE__ */ React9.createElement("div", { className: "h", style: { marginTop: 0 } }, "HOST"), step === 0 && /* @__PURE__ */ React9.createElement("button", { className: "btn pri", onClick: create }, "CREATE ROOM \u25B6"), step >= 1 && /* @__PURE__ */ React9.createElement(React9.Fragment, null, /* @__PURE__ */ React9.createElement("div", { style: { fontSize: 10, letterSpacing: ".2em", color: "var(--dim)" } }, "1 \u2014 SEND THIS CODE TO YOUR FRIEND"), box(code, true), /* @__PURE__ */ React9.createElement("button", { className: "btn sm", style: { marginBottom: 14 }, onClick: () => copy(code) }, "COPY CODE"), /* @__PURE__ */ React9.createElement("div", { style: { fontSize: 10, letterSpacing: ".2em", color: "var(--dim)" } }, "2 \u2014 PASTE THEIR ANSWER CODE"), box(input, false), /* @__PURE__ */ React9.createElement("button", { className: "btn pri", onClick: accept }, "CONNECT \u25B6"))), role === "guest" && /* @__PURE__ */ React9.createElement("div", { className: "panel", style: { padding: 18 } }, /* @__PURE__ */ React9.createElement("div", { className: "h", style: { marginTop: 0 } }, "JOIN"), step === 0 && /* @__PURE__ */ React9.createElement(React9.Fragment, null, /* @__PURE__ */ React9.createElement("div", { style: { fontSize: 10, letterSpacing: ".2em", color: "var(--dim)" } }, "PASTE THE HOST CODE"), box(input, false), /* @__PURE__ */ React9.createElement("button", { className: "btn pri", onClick: join }, "JOIN \u25B6")), step >= 2 && /* @__PURE__ */ React9.createElement(React9.Fragment, null, /* @__PURE__ */ React9.createElement("div", { style: { fontSize: 10, letterSpacing: ".2em", color: "var(--dim)" } }, "SEND THIS CODE BACK TO THE HOST"), box(code, true), /* @__PURE__ */ React9.createElement("button", { className: "btn sm", onClick: () => copy(code) }, "COPY CODE"), /* @__PURE__ */ React9.createElement("div", { className: "hint", style: { marginTop: 10 } }, "Waiting for the host to accept\u2026 you will drop into the lobby automatically."))), status && /* @__PURE__ */ React9.createElement("div", { className: `toast ${bad ? "bad" : ""}`, style: { position: "static", marginTop: 16 } }, status), role && step < 3 && /* @__PURE__ */ React9.createElement("button", { className: "btn ghost sm", style: { marginTop: 16 }, onClick: () => {
    setRole(null);
    setStep(0);
    setStatus("");
    netRef.current?.close();
    netRef.current = null;
  } }, "\u25C0 START OVER")));
}

// src/App.jsx
import React10, { useState as useState6, useEffect as useEffect3, useRef as useRef2, useCallback } from "react";

// src/game/core/Game.js
import * as THREE8 from "three";

// src/game/core/World.js
import * as THREE3 from "three";
var World = class {
  constructor(map) {
    this.map = map;
    this.scene = new THREE3.Scene();
    this.physics = new PhysicsWorld(8);
    this.group = new THREE3.Group();
    this.scene.add(this.group);
    this.buildSky(map);
    this.buildLights();
    this.buildBrushes(map);
    this.physics.build();
  }
  buildSky(map) {
    const [top, bottom] = map.sky;
    this.scene.background = new THREE3.Color(bottom);
    this.scene.fog = new THREE3.Fog(map.fog, map.fogNear, map.fogFar);
    const geo = new THREE3.SphereGeometry(400, 16, 12);
    const matSky = new THREE3.ShaderMaterial({
      side: THREE3.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { top: { value: new THREE3.Color(top) }, bottom: { value: new THREE3.Color(bottom) } },
      vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vP;
        void main(){ float h = clamp(vP.y / 400.0 * 0.5 + 0.5, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottom, top, pow(h, 0.7)), 1.0); }`
    });
    const sky = new THREE3.Mesh(geo, matSky);
    sky.frustumCulled = false;
    this.scene.add(sky);
  }
  buildLights() {
    const hemi = new THREE3.HemisphereLight(10475775, 2764600, 1.15);
    this.scene.add(hemi);
    const sun = new THREE3.DirectionalLight(16773856, 1.55);
    sun.position.set(60, 90, 40);
    this.scene.add(sun);
    const rim = new THREE3.DirectionalLight(7268351, 0.5);
    rim.position.set(-50, 40, -60);
    this.scene.add(rim);
    this.sun = sun;
  }
  buildBrushes(map) {
    const n = map.brushes.length;
    const geo = new THREE3.BoxGeometry(1, 1, 1);
    const mat2 = new THREE3.MeshLambertMaterial({ flatShading: true });
    const mesh = new THREE3.InstancedMesh(geo, mat2, n);
    mesh.instanceMatrix.setUsage(THREE3.StaticDrawUsage);
    const m4 = new THREE3.Matrix4();
    const q = new THREE3.Quaternion();
    const e = new THREE3.Euler();
    const pos = new THREE3.Vector3();
    const scl = new THREE3.Vector3();
    const col = new THREE3.Color();
    map.brushes.forEach((b, i) => {
      const br = this.physics.add(new Brush(b));
      e.set(b.rot[0], b.rot[1], b.rot[2], "YXZ");
      q.setFromEuler(e);
      pos.set(b.center[0], b.center[1], b.center[2]);
      scl.set(b.half[0] * 2, b.half[1] * 2, b.half[2] * 2);
      m4.compose(pos, q, scl);
      mesh.setMatrixAt(i, m4);
      const tint = 0.92 + i * 2654435761 % 1e3 / 1e3 * 0.16;
      col.setHex(b.color ?? PAL.wall).multiplyScalar(tint);
      mesh.setColorAt(i, col);
      this.brushRefs = this.brushRefs || [];
      this.brushRefs.push(br);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    this.mesh = mesh;
    this.group.add(mesh);
    const edges = new THREE3.Group();
    const em = new THREE3.LineBasicMaterial({ color: 856343, transparent: true, opacity: 0.32 });
    let added = 0;
    for (const b of map.brushes) {
      if (added > 260) break;
      const g = new THREE3.EdgesGeometry(new THREE3.BoxGeometry(b.half[0] * 2, b.half[1] * 2, b.half[2] * 2));
      const l = new THREE3.LineSegments(g, em);
      l.position.set(b.center[0], b.center[1], b.center[2]);
      l.rotation.set(b.rot[0], b.rot[1], b.rot[2]);
      l.rotation.order = "YXZ";
      edges.add(l);
      added++;
    }
    this.edges = edges;
    this.group.add(edges);
  }
  dispose() {
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  }
};

// src/game/core/VFX.js
import * as THREE4 from "three";
var _m = new THREE4.Matrix4();
var _q2 = new THREE4.Quaternion();
var _v3 = new THREE4.Vector3();
var _s = new THREE4.Vector3();
var UP = new THREE4.Vector3(0, 1, 0);
var VFX = class {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;
    this.pCount = 900;
    const pg = new THREE4.BoxGeometry(1, 1, 1);
    const pm = new THREE4.MeshBasicMaterial({ vertexColors: false, toneMapped: false });
    this.particles = new THREE4.InstancedMesh(pg, pm, this.pCount);
    this.particles.instanceMatrix.setUsage(THREE4.DynamicDrawUsage);
    this.particles.frustumCulled = false;
    this.particles.count = this.pCount;
    scene.add(this.particles);
    this.pData = new Array(this.pCount).fill(null).map(() => ({
      life: 0,
      max: 1,
      pos: new THREE4.Vector3(),
      vel: new THREE4.Vector3(),
      size: 0.1,
      grav: 18,
      drag: 0.6,
      spin: 0,
      rot: 0
    }));
    this.pHead = 0;
    this._color = new THREE4.Color();
    this.tracers = [];
    for (let i = 0; i < 56; i++) {
      const g = new THREE4.BoxGeometry(1, 1, 1);
      const m = new THREE4.MeshBasicMaterial({ transparent: true, opacity: 1, toneMapped: false });
      const mesh = new THREE4.Mesh(g, m);
      mesh.visible = false;
      mesh.frustumCulled = false;
      scene.add(mesh);
      this.tracers.push({ mesh, life: 0, max: 0.08 });
    }
    this.tHead = 0;
    this.beams = [];
    for (let i = 0; i < 12; i++) {
      const g = new THREE4.CylinderGeometry(1, 1, 1, 6, 1, true);
      const m = new THREE4.MeshBasicMaterial({ transparent: true, opacity: 0.9, toneMapped: false });
      const mesh = new THREE4.Mesh(g, m);
      mesh.visible = false;
      scene.add(mesh);
      this.beams.push({ mesh, life: 0, max: 0.12 });
    }
    this.bHead = 0;
    this.smoke = [];
    const sg = new THREE4.IcosahedronGeometry(1, 0);
    for (let i = 0; i < 90; i++) {
      const m = new THREE4.MeshLambertMaterial({ transparent: true, opacity: 0.5, flatShading: true });
      const mesh = new THREE4.Mesh(sg, m);
      mesh.visible = false;
      scene.add(mesh);
      this.smoke.push({ mesh, life: 0, max: 1, size: 1, vel: new THREE4.Vector3() });
    }
    this.sHead = 0;
    this.booms = [];
    for (let i = 0; i < 10; i++) {
      const g = new THREE4.IcosahedronGeometry(1, 1);
      const m = new THREE4.MeshBasicMaterial({ transparent: true, opacity: 0.85, toneMapped: false });
      const mesh = new THREE4.Mesh(g, m);
      mesh.visible = false;
      scene.add(mesh);
      this.booms.push({ mesh, life: 0, max: 0.45, size: 1 });
    }
    this.boomHead = 0;
    this.flashes = [];
    for (let i = 0; i < 8; i++) {
      const g = new THREE4.ConeGeometry(1, 1, 5);
      const m = new THREE4.MeshBasicMaterial({ transparent: true, opacity: 1, toneMapped: false });
      const mesh = new THREE4.Mesh(g, m);
      mesh.visible = false;
      scene.add(mesh);
      const light = new THREE4.PointLight(16764040, 0, 8);
      light.visible = false;
      scene.add(light);
      this.flashes.push({ mesh, light, life: 0, max: 0.06 });
    }
    this.fHead = 0;
  }
  particle(pos, vel, color, size, life, grav = 18, drag = 0.6) {
    const p = this.pData[this.pHead];
    this.pHead = (this.pHead + 1) % this.pCount;
    p.life = p.max = life;
    p.pos.copy(pos);
    p.vel.copy(vel);
    p.size = size;
    p.grav = grav;
    p.drag = drag;
    p.rot = Math.random() * 6.28;
    p.spin = (Math.random() - 0.5) * 14;
    this._pColor = color;
    this.particles.setColorAt(this.pHead === 0 ? this.pCount - 1 : this.pHead - 1, this._color.set(color));
    if (this.particles.instanceColor) this.particles.instanceColor.needsUpdate = true;
  }
  burst(pos, count, color, speed, size, life, grav = 18) {
    for (let i = 0; i < count; i++) {
      const dir = _v3.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
      this.particle(
        pos,
        dir.multiplyScalar(speed * (0.4 + Math.random())),
        color,
        size * (0.5 + Math.random()),
        life * (0.6 + Math.random() * 0.7),
        grav
      );
    }
  }
  impact(point, normal, color = 16767392, count = 7) {
    for (let i = 0; i < count; i++) {
      const dir = _v3.copy(normal).add(new THREE4.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.9)).normalize();
      this.particle(point, dir.multiplyScalar(3 + Math.random() * 5), color, 0.035 + Math.random() * 0.05, 0.28 + Math.random() * 0.3, 16, 1.6);
    }
  }
  bloodPuff(point, dir) {
    for (let i = 0; i < 6; i++) {
      const d = _v3.copy(dir).multiplyScalar(-1).add(new THREE4.Vector3(Math.random() - 0.5, Math.random() * 0.6, Math.random() - 0.5)).normalize();
      this.particle(point, d.multiplyScalar(2 + Math.random() * 4), 16731501, 0.05, 0.35, 14, 1.2);
    }
  }
  tracer(from, to, color = 16773296, width = 0.022, life = 0.07) {
    const t = this.tracers[this.tHead];
    this.tHead = (this.tHead + 1) % this.tracers.length;
    const d = _v3.copy(to).sub(from);
    const len = d.length();
    if (len < 0.01) return;
    t.mesh.position.copy(from).addScaledVector(d, 0.5);
    t.mesh.quaternion.setFromUnitVectors(UP, d.clone().normalize());
    t.mesh.scale.set(width, len, width);
    t.mesh.material.color.setHex(color);
    t.mesh.material.opacity = 1;
    t.mesh.visible = true;
    t.life = t.max = life;
  }
  beam(from, to, color = 11766015, width = 0.05, life = 0.1) {
    const b = this.beams[this.bHead];
    this.bHead = (this.bHead + 1) % this.beams.length;
    const d = _v3.copy(to).sub(from);
    const len = d.length();
    if (len < 0.01) return;
    b.mesh.position.copy(from).addScaledVector(d, 0.5);
    b.mesh.quaternion.setFromUnitVectors(UP, d.clone().normalize());
    b.mesh.scale.set(width, len, width);
    b.mesh.material.color.setHex(color);
    b.mesh.material.opacity = 0.9;
    b.mesh.visible = true;
    b.life = b.max = life;
  }
  explosion(pos, radius = 5, color = 16752970) {
    const b = this.booms[this.boomHead];
    this.boomHead = (this.boomHead + 1) % this.booms.length;
    b.mesh.position.copy(pos);
    b.mesh.material.color.setHex(color);
    b.mesh.visible = true;
    b.life = b.max = 0.45;
    b.size = radius;
    this.burst(pos, 26, color, radius * 3.2, 0.14, 0.6, 12);
    this.burst(pos, 10, 3815994, radius * 1.4, 0.3, 1.1, 2);
    for (let i = 0; i < 6; i++) this.smokePuff(pos, radius * 0.4, 5594987, 1.6 + Math.random());
  }
  smokePuff(pos, size, color = 12568529, dur = 3) {
    const s = this.smoke[this.sHead];
    this.sHead = (this.sHead + 1) % this.smoke.length;
    s.mesh.position.copy(pos);
    s.mesh.material.color.setHex(color);
    s.mesh.visible = true;
    s.life = s.max = dur;
    s.size = size;
    s.vel.set((Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6);
    return s;
  }
  muzzle(pos, dir, scale = 1, color = 16767392) {
    const f = this.flashes[this.fHead];
    this.fHead = (this.fHead + 1) % this.flashes.length;
    f.mesh.position.copy(pos);
    f.mesh.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
    const s = 0.16 * scale;
    f.mesh.scale.set(s, s * 2.1, s);
    f.mesh.material.color.setHex(color);
    f.mesh.material.opacity = 1;
    f.mesh.visible = true;
    f.light.position.copy(pos);
    f.light.intensity = 6 * scale;
    f.light.visible = true;
    f.life = f.max = 0.055;
  }
  update(dt) {
    this.time += dt;
    const data = this.pData;
    for (let i = 0; i < this.pCount; i++) {
      const p = data[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        _s.set(0, 0, 0);
        _m.compose(p.pos, _q2.identity(), _s);
        this.particles.setMatrixAt(i, _m);
        continue;
      }
      p.vel.y -= p.grav * dt;
      p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.pos.addScaledVector(p.vel, dt);
      p.rot += p.spin * dt;
      const k = p.life / p.max;
      const sz = p.size * (0.35 + 0.65 * k);
      _q2.setFromAxisAngle(UP, p.rot);
      _s.set(sz, sz, sz);
      _m.compose(p.pos, _q2, _s);
      this.particles.setMatrixAt(i, _m);
    }
    this.particles.instanceMatrix.needsUpdate = true;
    for (const t of this.tracers) {
      if (t.life <= 0) continue;
      t.life -= dt;
      if (t.life <= 0) {
        t.mesh.visible = false;
        continue;
      }
      t.mesh.material.opacity = t.life / t.max;
    }
    for (const b of this.beams) {
      if (b.life <= 0) continue;
      b.life -= dt;
      if (b.life <= 0) {
        b.mesh.visible = false;
        continue;
      }
      b.mesh.material.opacity = 0.9 * (b.life / b.max);
      b.mesh.scale.x = b.mesh.scale.z = b.mesh.scale.x * (0.6 + 0.4 * (b.life / b.max));
    }
    for (const b of this.booms) {
      if (b.life <= 0) continue;
      b.life -= dt;
      if (b.life <= 0) {
        b.mesh.visible = false;
        continue;
      }
      const k = 1 - b.life / b.max;
      const s = b.size * (0.25 + k * 0.85);
      b.mesh.scale.set(s, s, s);
      b.mesh.material.opacity = 0.85 * (1 - k) ** 1.5;
      b.mesh.rotation.y += dt * 3;
      b.mesh.rotation.x += dt * 2;
    }
    for (const s of this.smoke) {
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.mesh.visible = false;
        continue;
      }
      const k = 1 - s.life / s.max;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.vel.multiplyScalar(1 - dt * 0.8);
      const sz = s.size * (0.5 + k * 1.6);
      s.mesh.scale.set(sz, sz, sz);
      s.mesh.material.opacity = 0.42 * Math.sin(Math.PI * Math.min(1, k * 1.15)) * (1 - k * 0.3);
      s.mesh.rotation.y += dt * 0.6;
    }
    for (const f of this.flashes) {
      if (f.life <= 0) continue;
      f.life -= dt;
      if (f.life <= 0) {
        f.mesh.visible = false;
        f.light.visible = false;
        f.light.intensity = 0;
        continue;
      }
      const k = f.life / f.max;
      f.mesh.material.opacity = k;
      f.light.intensity = 6 * k;
    }
  }
  clear() {
    for (const p of this.pData) p.life = 0;
    for (const t of this.tracers) {
      t.life = 0;
      t.mesh.visible = false;
    }
    for (const b of this.beams) {
      b.life = 0;
      b.mesh.visible = false;
    }
    for (const b of this.booms) {
      b.life = 0;
      b.mesh.visible = false;
    }
    for (const s of this.smoke) {
      s.life = 0;
      s.mesh.visible = false;
    }
    for (const f of this.flashes) {
      f.life = 0;
      f.mesh.visible = false;
      f.light.visible = false;
    }
    this.update(0.016);
  }
};

// src/game/core/Audio.js
var AudioKit = class {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.7;
    this.enabled = true;
    this.noise = null;
  }
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 8;
    this.master.connect(comp).connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 1;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  }
  resume() {
    this.init();
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }
  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }
  _noiseBurst(dur, freq, q, gain, type = "bandpass") {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 1 + Math.random() * 0.2;
    const filt = this.ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    filt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(8e-4, t + dur);
    src.connect(filt).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
  _tone(freq, dur, gain, type = "sine", slide = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(1e-4, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 6e-3);
    g.gain.exponentialRampToValueAtTime(8e-4, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  shot(p = {}) {
    if (!this.enabled) return;
    const { pitch = 1, len = 0.16, gain = 0.5, body = 180 } = p;
    this._noiseBurst(len, 1400 * pitch, 0.8, gain);
    this._noiseBurst(len * 1.7, 320 * pitch, 0.5, gain * 0.5, "lowpass");
    this._tone(body * pitch, len * 0.8, gain * 0.5, "square", -body * 0.6 * pitch);
  }
  melee() {
    this.enabled && this._noiseBurst(0.16, 900, 1.2, 0.28, "bandpass");
  }
  hit() {
    this.enabled && this._tone(1250, 0.07, 0.22, "square", 250);
  }
  headshot() {
    this.enabled && (this._tone(1500, 0.07, 0.25, "square", 500), this._tone(2200, 0.06, 0.16, "sine"));
  }
  kill() {
    if (!this.enabled) return;
    this._tone(660, 0.1, 0.22, "triangle");
    setTimeout(() => this._tone(990, 0.16, 0.22, "triangle"), 70);
  }
  reload() {
    if (!this.enabled) return;
    this._tone(320, 0.05, 0.16, "square", -120);
    setTimeout(() => this._tone(240, 0.07, 0.16, "square", -80), 160);
  }
  explode() {
    if (!this.enabled) return;
    this._noiseBurst(0.75, 180, 0.4, 0.75, "lowpass");
    this._tone(70, 0.55, 0.5, "sine", -40);
  }
  jump() {
    this.enabled && this._tone(420, 0.07, 0.09, "sine", 180);
  }
  land(i = 1) {
    this.enabled && this._noiseBurst(0.12, 260, 0.6, 0.1 + 0.18 * i, "lowpass");
  }
  slide() {
    this.enabled && this._noiseBurst(0.42, 620, 0.9, 0.16);
  }
  step(s = 1) {
    this.enabled && this._noiseBurst(0.06, 300 + Math.random() * 120, 1.4, 0.05 * s, "lowpass");
  }
  ui(up = true) {
    this.enabled && this._tone(up ? 720 : 420, 0.05, 0.1, "triangle", up ? 180 : -120);
  }
  beep() {
    this.enabled && this._tone(880, 0.08, 0.12, "square");
  }
  hurt() {
    this.enabled && this._noiseBurst(0.2, 500, 0.7, 0.3, "bandpass");
  }
  roundWin() {
    this.enabled && [523, 659, 784].forEach((f, i) => setTimeout(() => this._tone(f, 0.18, 0.16, "triangle"), i * 90));
  }
  roundLose() {
    this.enabled && [392, 330, 262].forEach((f, i) => setTimeout(() => this._tone(f, 0.22, 0.14, "sawtooth"), i * 110));
  }
};

// src/game/core/Camera.js
import * as THREE5 from "three";
var lerp = (a, b, t) => a + (b - a) * t;
var clamp2 = (v, a, b) => v < a ? a : v > b ? b : v;
var CameraRig = class {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0;
    this.baseFov = 95;
    this.fov = this.baseFov;
    this.eye = TUNE.standEye;
    this.eyeTarget = TUNE.standEye;
    this.dip = 0;
    this.dipVel = 0;
    this.roll = 0;
    this.bob = 0;
    this.bobPhase = 0;
    this.slideTilt = 0;
    this.recoil = new THREE5.Vector2();
    this.recoilVel = new THREE5.Vector2();
    this.shake = 0;
    this.pos = new THREE5.Vector3();
    this.sprintBlend = 0;
    this.slideBlend = 0;
    this.landPunch = 0;
  }
  reset(yaw = 0) {
    this.yaw = yaw;
    this.pitch = 0;
    this.dip = this.dipVel = 0;
    this.roll = 0;
    this.recoil.set(0, 0);
    this.recoilVel.set(0, 0);
    this.shake = 0;
    this.eye = TUNE.standEye;
  }
  addRecoil(v, h) {
    this.recoilVel.x -= v * 0.02;
    this.recoilVel.y += (Math.random() - 0.5) * h * 0.02;
  }
  addShake(amount) {
    this.shake = Math.min(1.2, this.shake + amount);
  }
  update(dt, mv, ads, adsFov, opts = {}) {
    this.yaw = mv.yaw;
    this.pitch = clamp2(mv.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
    this.eyeTarget = mv.sliding ? TUNE.slideEye : mv.crouching ? TUNE.crouchEye : TUNE.standEye;
    const eyeRate = 1 - Math.exp(-(mv.sliding ? 16 : 12) * dt);
    this.eye = lerp(this.eye, this.eyeTarget, eyeRate);
    if (mv.landImpact > 0) {
      this.dipVel -= mv.landImpact * 3.4;
      mv.landImpact = 0;
    }
    const k = 190, c = 22;
    this.dipVel += (-k * this.dip - c * this.dipVel) * dt;
    this.dip += this.dipVel * dt;
    this.dip = clamp2(this.dip, -0.42, 0.2);
    const sprinting = mv.sprinting && mv.horizontalSpeed > 7.5 && mv.grounded;
    this.sprintBlend = lerp(this.sprintBlend, sprinting ? 1 : 0, 1 - Math.exp(-9 * dt));
    this.slideBlend = lerp(this.slideBlend, mv.sliding ? 1 : 0, 1 - Math.exp(-14 * dt));
    const right = Math.sin(this.yaw), cosY = Math.cos(this.yaw);
    const lateral = -mv.vel.x * cosY + mv.vel.z * right;
    const targetRoll = clamp2(-lateral / 13, -1, 1) * 0.055 + this.slideBlend * lateral * 4e-3;
    this.roll = lerp(this.roll, targetRoll, 1 - Math.exp(-8 * dt));
    const sp = mv.horizontalSpeed;
    const bobAmp = mv.grounded && !mv.sliding ? clamp2(sp / 11, 0, 1.2) * 0.022 : 0;
    this.bobPhase += dt * (6.5 + sp * 0.55);
    this.bob = Math.sin(this.bobPhase) * bobAmp;
    const bobX = Math.cos(this.bobPhase * 0.5) * bobAmp * 0.9;
    const speedFov = clamp2((sp - 6) / 9, 0, 1);
    let fovTarget = this.baseFov + this.sprintBlend * 7 + speedFov * 5 + this.slideBlend * 3;
    if (ads > 0.01 && adsFov) fovTarget = lerp(fovTarget, adsFov, ads);
    fovTarget += clamp2(-this.dip, 0, 0.4) * 8;
    this.fov = lerp(this.fov, fovTarget, 1 - Math.exp(-(ads > 0.5 ? 18 : 11) * dt));
    this.recoilVel.multiplyScalar(Math.exp(-14 * dt));
    this.recoil.addScaledVector(this.recoilVel, dt * 60);
    this.recoil.multiplyScalar(Math.exp(-9 * dt));
    this.shake = Math.max(0, this.shake - dt * 2.6);
    const sh = this.shake * this.shake * 0.02;
    this.pos.set(mv.pos.x, mv.pos.y + this.eye + this.dip + this.bob, mv.pos.z);
    this.camera.position.copy(this.pos);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(
      this.pitch + this.recoil.x + (Math.random() - 0.5) * sh,
      this.yaw + this.recoil.y + (Math.random() - 0.5) * sh,
      this.roll
    );
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
    this._bobX = bobX;
  }
};

// src/game/core/Input.js
var Input = class {
  constructor() {
    this.keys = {};
    this.pressed = {};
    this.released = {};
    this.mouse = { dx: 0, dy: 0 };
    this.mouseButtons = [false, false, false];
    this.mousePressed = [false, false, false];
    this.wheel = 0;
    this.locked = false;
    this.fallback = false;
    this.enabled = true;
    this.sensitivity = 1;
    this.invertY = false;
    this._onLock = null;
  }
  attach(el) {
    this.el = el;
    const kd = (e) => {
      if (e.code === "Tab") e.preventDefault();
      if (e.code === "Escape" && this.fallback) {
        this.fallback = false;
        this._onLock?.(false);
      }
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    };
    const ku = (e) => {
      this.keys[e.code] = false;
      this.released[e.code] = true;
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", () => {
      this.keys = {};
    });
    const mm = (e) => {
      if (!this.engaged) return;
      this.mouse.dx += e.movementX || 0;
      this.mouse.dy += e.movementY || 0;
    };
    document.addEventListener("mousemove", mm);
    el.addEventListener("mousedown", (e) => {
      if (!this.engaged) return;
      if (!this.mouseButtons[e.button]) this.mousePressed[e.button] = true;
      this.mouseButtons[e.button] = true;
    });
    window.addEventListener("mouseup", (e) => {
      this.mouseButtons[e.button] = false;
    });
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("pointerlockchange", () => {
      const was = this.engaged;
      if (document.pointerLockElement === el) {
        this.locked = true;
        this.fallback = false;
      } else {
        this.locked = false;
        this._lastExit = performance.now();
      }
      if (was !== this.engaged) this._onLock?.(this.engaged);
    });
    window.addEventListener("wheel", (e) => {
      this.wheel += Math.sign(e.deltaY);
    }, { passive: true });
  }
  get engaged() {
    return this.locked || this.fallback;
  }
  // Chrome rate-limits re-locking for ~1.25 s after an exit, and rejects the
  // request outright outside a user gesture — so swallow failures and retry.
  // If no lock shows up at all (embedded iframe, permission denied) we fall
  // back to free-cursor mouse look so the game is always playable.
  requestLock(retry = true, fromUser = true) {
    if (!this.el || this.locked || !this.enabled) return;
    const wait = 1350 - (performance.now() - (this._lastExit || 0));
    if (wait > 0) {
      if (retry && !this._retryT) {
        this._retryT = setTimeout(() => {
          this._retryT = null;
          this.requestLock(false);
        }, wait + 50);
      }
      return;
    }
    clearTimeout(this._fbT);
    try {
      const p = this.el.requestPointerLock?.();
      if (p && typeof p.catch === "function") p.catch(() => {
      });
    } catch (e) {
    }
    if (fromUser) {
      this._fbT = setTimeout(() => {
        if (!this.locked) {
          this.fallback = true;
          this._onLock?.(true);
        }
      }, 900);
    }
  }
  exitLock() {
    this._lastExit = performance.now();
    clearTimeout(this._fbT);
    this.fallback = false;
    if (this.locked) document.exitPointerLock?.();
  }
  onLockChange(fn) {
    this._onLock = fn;
  }
  clearFallback() {
    clearTimeout(this._fbT);
  }
  down(code) {
    return !!this.keys[code];
  }
  hit(code) {
    return !!this.pressed[code];
  }
  // Build the movement input for one frame.
  moveFrame() {
    const k = this.keys;
    const forward = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0);
    const right = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
    return {
      forward,
      right,
      jump: !!k.Space,
      crouch: !!k.ControlLeft || !!k.KeyC || !!k.ShiftRight,
      sprint: !!k.ShiftLeft,
      jumpPressed: !!this.pressed.Space,
      crouchPressed: !!this.pressed.ControlLeft || !!this.pressed.KeyC || !!this.pressed.ShiftRight,
      mouseDx: this.mouse.dx
    };
  }
  // Call once per rendered frame, after the game has read everything.
  endFrame() {
    this.pressed = {};
    this.released = {};
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.mousePressed = [false, false, false];
    this.wheel = 0;
  }
};

// src/game/core/Weapons.js
var clamp3 = (v, a, b) => v < a ? a : v > b ? b : v;
function momentumScale(speed, kind = "gun") {
  const t = clamp3((speed - 5) / 12, 0, 1.5);
  return 1 + t * (kind === "melee" ? 1 : 0.55);
}
var Weapon = class {
  constructor(defId, skin) {
    this.setId(defId);
    this.skin = skin;
    this.reset(true);
  }
  setId(id) {
    this.def = WEAPON_MAP[id] || WEAPON_MAP.vex9;
    this.id = this.def.id;
  }
  reset(full = true) {
    const s = this.def.stats;
    this.ammo = s.mag ?? 1;
    if (full) this.reserve = s.reserve ?? 0;
    this.fireTimer = 0;
    this.reloadTimer = 0;
    this.reloading = false;
    this.burstLeft = 0;
    this.burstTimer = 0;
    this.charge = 0;
    this.charging = false;
    this.bloom = 0;
    this.spin = 0;
    this.boltTimer = 0;
    this.ads = 0;
    this.shots = 0;
    this.lastFire = -99;
  }
  get isMelee() {
    return this.def.stats.type === "melee";
  }
  get isUtility() {
    return ["throw", "self", "hook", "place"].includes(this.def.stats.type);
  }
  get empty() {
    return !this.isMelee && !this.isUtility && this.ammo <= 0;
  }
  get canReload() {
    return !this.isMelee && !this.reloading && this.ammo < this.def.stats.mag && this.reserve > 0;
  }
  startReload() {
    if (!this.canReload) return false;
    this.reloading = true;
    this.reloadTimer = this.def.stats.reload;
    return true;
  }
  cancelReload() {
    this.reloading = false;
    this.reloadTimer = 0;
  }
  finishReload() {
    const s = this.def.stats;
    const need = s.mag - this.ammo;
    const take = Math.min(need, this.reserve);
    this.ammo += take;
    this.reserve -= take;
    this.reloading = false;
  }
  // ctx: { dt, speed, grounded, sliding, crouching, wantAds, wantFire, wantFirePressed, t }
  update(dt, ctx) {
    const s = this.def.stats;
    this.fireTimer = Math.max(0, this.fireTimer - dt);
    this.burstTimer = Math.max(0, this.burstTimer - dt);
    this.boltTimer = Math.max(0, this.boltTimer - dt);
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) this.finishReload();
    }
    const adsRate = 1 / Math.max(0.05, s.adsTime ?? 0.2);
    const wantAds = ctx.wantAds && !this.reloading && !this.slidingBlocked;
    this.ads = clamp3(this.ads + (wantAds ? dt * adsRate : -dt * adsRate * 1.35), 0, 1);
    this.bloom = Math.max(0, this.bloom - dt * (this.isMelee ? 6 : 3.2));
    this.spin = Math.max(0, this.spin - dt * 1.6);
    if (s.charge) {
      if (ctx.wantFire && !this.reloading && this.ammo > 0 && this.fireTimer <= 0) {
        this.charging = true;
        this.charge = Math.min(1, this.charge + dt / s.charge);
      }
    }
  }
  // returns a shot descriptor or null
  tryFire(ctx) {
    const s = this.def.stats;
    if (this.reloading || this.fireTimer > 0 || this.boltTimer > 0) return null;
    const asking = !!(ctx.wantFire || ctx.wantFirePressed || ctx.wantFireReleased);
    if (!asking && !(s.burst && this.burstLeft > 0)) return null;
    if (this.isMelee) {
      if (ctx.t - this.lastFire < 1 / s.rate) return null;
      this.lastFire = ctx.t;
      this.bloom = Math.min(3, this.bloom + 1);
      return { def: this.def, pellets: 1, spread: 0, dmg: s.dmg, kind: "melee" };
    }
    if (this.isUtility) return null;
    if (this.ammo <= 0) return null;
    if (s.charge) {
      if (!this.charging) return null;
      if (!ctx.wantFireReleased && this.charge < 1) return null;
      if (this.charge < 0.12) return null;
    } else if (!s.auto) {
      if (!ctx.wantFirePressed) return null;
    }
    if (s.burst) {
      if (this.burstLeft <= 0) {
        if (!ctx.wantFirePressed && !ctx.wantFire) return null;
        if (!ctx.wantFirePressed) return null;
        this.burstLeft = s.burst;
      }
      this.burstLeft--;
    }
    this.ammo--;
    this.shots++;
    this.fireTimer = 60 / s.rpm;
    this.lastFire = ctx.t;
    if (s.burst && this.burstLeft > 0) this.burstTimer = s.burstDelay / s.burst;
    if (s.bolt) this.boltTimer = this.fireTimer * 1.5;
    this.spin = Math.min(1, this.spin + 0.34);
    const chargeMul = s.charge ? 1 + (s.chargeMul - 1) * this.charge : 1;
    this.charge = 0;
    this.charging = false;
    const spread = this.currentSpread(ctx);
    this.bloom = Math.min(this.isMelee ? 3 : 4.2, this.bloom + (s.pellets ? 1.6 : 0.85));
    return {
      def: this.def,
      pellets: s.pellets ?? 1,
      spread,
      dmg: (s.dmg ?? 20) * chargeMul,
      charge: chargeMul,
      kind: s.type
    };
  }
  currentSpread(ctx) {
    const s = this.def.stats;
    let base = (s.spreadHip ?? 2) + ((s.spreadAds ?? 0.3) - (s.spreadHip ?? 2)) * this.ads;
    const move = clamp3(ctx.speed / 12, 0, 1.3);
    base += move * (ctx.sliding ? 2.1 : 1.35) * (1 - this.ads * 0.65);
    if (!ctx.grounded) base += 1.9 * (1 - this.ads * 0.5);
    if (ctx.crouching && ctx.grounded) base *= 0.62;
    base += this.bloom * 0.5;
    if (s.spin) base *= 1 + (1 - this.spin) * 1.1;
    return Math.max(0, base);
  }
  falloffMul(dist) {
    const s = this.def.stats;
    if (!s.falloff) return 1;
    const [a, b, min] = s.falloff;
    if (dist <= a) return 1;
    if (dist >= b) return min;
    return 1 + (min - 1) * ((dist - a) / (b - a));
  }
};
var UtilitySlot = class {
  constructor(defId) {
    this.setId(defId);
    this.reset();
  }
  setId(id) {
    this.def = WEAPON_MAP[id] || WEAPON_MAP.frag;
    this.id = this.def.id;
  }
  reset() {
    this.uses = this.def.stats.count ?? 1;
    this.cooldown = 0;
  }
  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
  }
  canUse() {
    return this.uses > 0 && this.cooldown <= 0;
  }
  consume() {
    this.uses--;
    this.cooldown = 0.7;
  }
};

// src/game/core/ViewModels.js
import * as THREE6 from "three";
var geoCache = /* @__PURE__ */ new Map();
var boxGeo = (w, h, d) => {
  const k = `b${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE6.BoxGeometry(w, h, d));
  return geoCache.get(k);
};
var cylGeo = (r, h, seg = 8) => {
  const k = `c${r.toFixed(3)},${h.toFixed(3)},${seg}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE6.CylinderGeometry(r, r, h, seg));
  return geoCache.get(k);
};
var icoGeo = (r) => {
  const k = `i${r.toFixed(3)}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE6.IcosahedronGeometry(r, 0));
  return geoCache.get(k);
};
function mat(color, emissive = 0, emissiveIntensity = 1) {
  return new THREE6.MeshLambertMaterial({
    color,
    flatShading: true,
    emissive,
    emissiveIntensity
  });
}
function part(parent, geo, material, x = 0, y = 0, z = 0, rot = [0, 0, 0]) {
  const m = new THREE6.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rot[0], rot[1], rot[2]);
  parent.add(m);
  return m;
}
function buildViewModel(def, skin) {
  const m = def.model;
  const g = new THREE6.Group();
  const bodyCol = skin?.body ?? m.body;
  const accentCol = skin?.accent ?? m.accent;
  const glowCol = skin?.glow ?? (m.glow ? m.accent : 0);
  const body = mat(bodyCol);
  const dark = mat(new THREE6.Color(bodyCol).multiplyScalar(0.62).getHex());
  const metal = mat(new THREE6.Color(bodyCol).multiplyScalar(1.35).getHex());
  const accent = mat(accentCol, m.glow ? accentCol : 0, m.glow || skin?.reactive ? 0.5 : 0);
  const glow = new THREE6.MeshBasicMaterial({ color: glowCol || accentCol });
  const blade = m.blade !== void 0 ? mat(m.blade, m.blade, 0.25) : metal;
  const muzzle = new THREE6.Object3D();
  g.add(muzzle);
  let ads = 0;
  const L = m.len ?? 0.55;
  let kind = m.kind;
  if (kind === "energy" && def.slot === "melee") kind = "blade";
  if (kind === "energy" && def.slot === "utility") kind = "device";
  if (kind === "rifle" || kind === "smg" || kind === "lmg" || kind === "dmr" || kind === "sniper" || kind === "shotgun" || kind === "energy") {
    const recH = kind === "lmg" ? 0.11 : kind === "smg" ? 0.085 : 0.095;
    const recW = kind === "lmg" ? 0.11 : 0.085;
    const recL = L * 0.55;
    part(g, boxGeo(recW, recH, recL), body, 0, 0, 0);
    part(g, boxGeo(recW * 0.62, 0.022, recL * 0.85), dark, 0, recH / 2 + 0.011, -0.01);
    const bl = m.barrel;
    part(g, boxGeo(0.05, 0.05, bl), metal, 0, -5e-3, -recL / 2 - bl / 2);
    if (kind === "shotgun") part(g, boxGeo(0.075, 0.075, bl * 0.7), dark, 0, -0.012, -recL / 2 - bl * 0.34);
    if (kind === "sniper" || kind === "dmr") part(g, cylGeo(0.036, bl * 0.8, 8), dark, 0, -5e-3, -recL / 2 - bl * 0.4, [Math.PI / 2, 0, 0]);
    part(g, boxGeo(0.07, 0.055, L * 0.26), dark, 0, -0.012, -recL * 0.18);
    const grip = part(g, boxGeo(0.055, 0.15, 0.07), dark, 0, -0.085, recL * 0.12, [0.28, 0, 0]);
    if (m.drum) part(g, cylGeo(0.075, 0.055, 8), metal, 0, -0.075, -0.02, [Math.PI / 2, 0, 0]);
    else part(g, boxGeo(0.05, kind === "smg" ? 0.17 : 0.13, 0.062), metal, 0, -0.085, -0.03, [0.12, 0, 0]);
    if (m.stock) {
      part(g, boxGeo(0.06, 0.075, L * 0.3), body, 0, -8e-3, recL / 2 + L * 0.13);
      part(g, boxGeo(0.062, 0.1, 0.05), dark, 0, -0.01, recL / 2 + L * 0.29);
    } else {
      part(g, boxGeo(0.05, 0.07, 0.06), dark, 0, -0.01, recL / 2 + 0.02);
    }
    part(g, boxGeo(0.03, 0.045, 0.06), dark, 0, -0.055, recL * 0.02);
    if (m.sight === "scope") {
      part(g, cylGeo(0.032, 0.2, 8), dark, 0, recH / 2 + 0.045, -0.05, [Math.PI / 2, 0, 0]);
      part(g, cylGeo(0.038, 0.03, 8), body, 0, recH / 2 + 0.045, -0.15, [Math.PI / 2, 0, 0]);
      part(g, boxGeo(0.012, 0.03, 0.012), accent, 0, recH / 2 + 0.02, 0.06);
      ads = 0.02;
    } else if (m.sight === "holo") {
      part(g, boxGeo(0.055, 0.045, 0.05), dark, 0, recH / 2 + 0.03, -0.03);
      part(g, boxGeo(0.042, 0.03, 6e-3), glow, 0, recH / 2 + 0.032, -0.056);
    } else if (m.sight === "dot") {
      part(g, boxGeo(0.03, 0.03, 0.03), dark, 0, recH / 2 + 0.025, -0.03);
      part(g, boxGeo(0.012, 0.012, 4e-3), glow, 0, recH / 2 + 0.026, -0.046);
    } else {
      part(g, boxGeo(0.014, 0.03, 0.014), metal, 0, recH / 2 + 0.025, -recL / 2 + 0.02);
    }
    part(g, boxGeo(recW * 1.04, 0.012, 0.05), accent, 0, 0.01, -recL * 0.3);
    if (kind === "energy") {
      part(g, cylGeo(0.028, 0.09, 6), glow, 0, 5e-3, -recL / 2 - bl * 0.55, [Math.PI / 2, 0, 0]);
      part(g, boxGeo(0.02, 0.02, 0.18), glow, 0, recH / 2 + 0.03, 0.02);
    }
    muzzle.position.set(0, -5e-3, -recL / 2 - bl - 0.02);
    if (m.akimbo) {
      const twin = g.clone(true);
      twin.position.set(0.16, -0.02, 0.02);
      g.add(twin);
      g.position.x = -0.08;
    }
  } else if (kind === "pistol" || kind === "revolver") {
    part(g, boxGeo(0.05, 0.07, L), body, 0, 0, -L * 0.1);
    part(g, boxGeo(0.042, 0.05, m.barrel), metal, 0, 5e-3, -L * 0.1 - L / 2 - m.barrel / 2);
    part(g, boxGeo(0.05, 0.13, 0.065), dark, 0, -0.085, 0.02, [0.25, 0, 0]);
    if (kind === "revolver") part(g, cylGeo(0.045, 0.075, 8), metal, 0, -5e-3, -0.02, [Math.PI / 2, 0, 0]);
    else part(g, boxGeo(0.04, 0.075, 0.05), metal, 0, -0.07, 0.015, [0.1, 0, 0]);
    part(g, boxGeo(0.045, 0.014, 0.05), accent, 0, 0.04, -L * 0.1);
    part(g, boxGeo(0.01, 0.022, 0.01), metal, 0, 0.055, -L * 0.1 - L * 0.42);
    muzzle.position.set(0, 5e-3, -L * 0.6 - m.barrel);
  } else if (kind === "blade") {
    part(g, boxGeo(0.035, 0.035, 0.17), dark, 0, -0.02, 0.1, [0.2, 0, 0]);
    part(g, boxGeo(0.07, 0.012, 0.02), accent, 0, -5e-3, 0.02);
    const bladeLen = L * 0.8;
    part(g, boxGeo(0.012, 0.075, bladeLen), blade, 0, 0.01, -bladeLen / 2 - 0.02);
    part(g, boxGeo(6e-3, 0.02, bladeLen * 0.9), glow, 0, 0.01, -bladeLen / 2 - 0.03);
    muzzle.position.set(0, 0.01, -bladeLen - 0.05);
  } else if (kind === "blunt") {
    part(g, boxGeo(0.032, 0.032, L * 0.45), dark, 0, -0.02, 0.16, [0.18, 0, 0]);
    part(g, boxGeo(0.055, 0.055, L * 0.5), body, 0, 0.01, -L * 0.12);
    part(g, boxGeo(0.06, 0.02, 0.05), accent, 0, 0.01, -L * 0.36);
    muzzle.position.set(0, 0.01, -L * 0.5);
  } else if (kind === "fist") {
    const fistMat = mat(m.body);
    const band = mat(m.accent);
    for (const s of [-1, 1]) {
      const f = new THREE6.Group();
      f.position.set(s * 0.11, -0.02, -0.12);
      part(f, boxGeo(0.085, 0.085, 0.13), fistMat, 0, 0, 0);
      part(f, boxGeo(0.09, 0.03, 0.05), band, 0, 0, 0.04);
      part(f, boxGeo(0.07, 0.03, 0.03), fistMat, 0, 0.03, -0.07);
      g.add(f);
    }
    muzzle.position.set(0, 0, -0.2);
  } else if (kind === "grenade") {
    part(g, icoGeo(0.055), body, 0, 0, 0);
    part(g, boxGeo(0.02, 0.04, 0.02), metal, 0, 0.06, 0);
    part(g, boxGeo(0.062, 0.012, 0.062), accent, 0, 0.03, 0);
    muzzle.position.set(0, 0.06, 0);
  } else {
    part(g, boxGeo(0.1, 0.07, 0.15), body, 0, 0, 0);
    part(g, boxGeo(0.07, 0.02, 0.09), glow, 0, 0.04, -0.02);
    part(g, boxGeo(0.03, 0.03, 0.03), accent, 0, -0.02, -0.08);
    muzzle.position.set(0, 0.01, -0.1);
  }
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  return { group: g, muzzle, adsOffset: ads, materials: [body, dark, metal, accent, glow, blade] };
}
function buildHeldWeapon(kind = "rifle", color = 2764600, accent = 7268351) {
  const g = new THREE6.Group();
  const body = mat(color);
  const metal = mat(new THREE6.Color(color).multiplyScalar(1.4).getHex());
  const glow = mat(accent, accent, 0.5);
  const long = kind === "sniper" || kind === "dmr";
  const short = kind === "pistol" || kind === "revolver";
  const big = kind === "lmg" || kind === "shotgun";
  const L = long ? 0.9 : big ? 0.7 : short ? 0.26 : 0.62;
  part(g, boxGeo(0.07, 0.09, L), body, 0, 0, 0);
  part(g, boxGeo(0.045, 0.045, L * 0.55), metal, 0, 5e-3, -L * 0.72);
  if (!short) part(g, boxGeo(0.06, 0.13, 0.08), body, 0, -0.09, L * 0.18, [0.3, 0, 0]);
  if (kind === "energy" || kind === "beam" || kind === "sniper") part(g, boxGeo(0.035, 0.035, 0.1), glow, 0, 0.01, -L * 0.95);
  if (kind === "melee") {
    g.clear();
    part(g, boxGeo(0.05, 0.05, 0.2), body, 0, 0, 0.05);
    part(g, boxGeo(0.02, 0.07, 0.55), metal, 0, 0.01, -0.3);
  }
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}
function buildCharacter(teamColor, isBot) {
  const g = new THREE6.Group();
  const skin = mat(isBot ? 9278371 : 14132083);
  const suit = mat(teamColor);
  const dark = mat(new THREE6.Color(teamColor).multiplyScalar(0.55).getHex());
  const accent = mat(1711396);
  part(g, boxGeo(0.52, 0.62, 0.3), suit, 0, 1.12, 0);
  part(g, boxGeo(0.56, 0.14, 0.34), dark, 0, 0.86, 0);
  part(g, boxGeo(0.26, 0.28, 0.26), skin, 0, 1.62, 0);
  part(g, boxGeo(0.28, 0.1, 0.28), accent, 0, 1.74, 0);
  part(g, boxGeo(0.22, 0.07, 0.03), mat(7268351, 7268351, 0.6), 0, 1.63, -0.14);
  part(g, boxGeo(0.13, 0.13, 0.44), suit, -0.24, 1.2, -0.24, [0.12, 0, 0]);
  part(g, boxGeo(0.13, 0.13, 0.44), suit, 0.24, 1.2, -0.24, [0.12, 0, 0]);
  part(g, boxGeo(0.17, 0.5, 0.17), dark, -0.14, 0.28, 0);
  part(g, boxGeo(0.17, 0.5, 0.17), dark, 0.14, 0.28, 0);
  part(g, boxGeo(0.19, 0.08, 0.24), accent, -0.14, 0.04, -0.02);
  part(g, boxGeo(0.19, 0.08, 0.24), accent, 0.14, 0.04, -0.02);
  part(g, boxGeo(0.53, 0.05, 0.31), accent, 0, 1.4, 0);
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}
function buildFighterModel(teamColor, isBot, weaponDef) {
  const g = buildCharacter(teamColor, isBot);
  const kind = weaponDef?.model?.kind ?? "rifle";
  const w = buildHeldWeapon(kind, weaponDef?.model?.body ?? 2764600, weaponDef?.model?.accent ?? 7268351);
  w.position.set(0.06, 1.16, -0.42);
  g.add(w);
  g.userData.weapon = w;
  g.userData.muzzle = new THREE6.Object3D();
  g.userData.muzzle.position.set(0.06, 1.17, -0.42 - (kind === "melee" ? 0.6 : 0.55));
  g.add(g.userData.muzzle);
  return g;
}

// src/game/core/Bot.js
import * as THREE7 from "three";
var _v4 = new THREE7.Vector3();
var _dir = new THREE7.Vector3();
var DIFFICULTY = {
  easy: { react: 0.55, err: 3.4, turn: 4.5, burst: [0.35, 0.8], strafe: 0.5, seeThrough: 0.55, hp: 1 },
  normal: { react: 0.34, err: 1.9, turn: 7, burst: [0.5, 1.3], strafe: 0.8, seeThrough: 0.7, hp: 1 },
  hard: { react: 0.2, err: 1, turn: 10.5, burst: [0.7, 1.9], strafe: 1, seeThrough: 0.85, hp: 1 },
  qyn: { react: 0.13, err: 0.55, turn: 14, burst: [0.9, 2.4], strafe: 1.2, seeThrough: 1, hp: 1 }
};
var Bot = class {
  constructor(fighter, level = "normal") {
    this.f = fighter;
    this.d = DIFFICULTY[level] || DIFFICULTY.normal;
    this.level = level;
    this.target = null;
    this.think = 0;
    this.react = 0;
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeTimer = 0;
    this.fireHold = 0;
    this.firePause = 0;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.wanderTimer = 0;
    this.jumpCd = 0;
    this.slideCd = 0;
    this.lastSeen = new THREE7.Vector3();
    this.hasSeen = false;
    this.aimYaw = 0;
    this.aimPitch = 0;
    this.stuckTimer = 0;
  }
  pickTarget(game) {
    let best = null, bestD = Infinity;
    for (const f of game.fighters) {
      if (!f.alive || f.team === this.f.team) continue;
      const d = f.mv.pos.distanceToSquared(this.f.mv.pos);
      if (d < bestD) {
        bestD = d;
        best = f;
      }
    }
    return best;
  }
  update(dt, game) {
    const f = this.f;
    if (!f.alive) return;
    this.think -= dt;
    this.strafeTimer -= dt;
    this.jumpCd -= dt;
    this.slideCd -= dt;
    this.firePause -= dt;
    this.wanderTimer -= dt;
    this.react -= dt;
    if (this.think <= 0) {
      this.think = 0.12 + Math.random() * 0.15;
      this.target = this.pickTarget(game);
      if (this.strafeTimer <= 0) {
        this.strafeTimer = 0.7 + Math.random() * 1.4;
        if (Math.random() < 0.55) this.strafeDir *= -1;
      }
    }
    if (this.dummy) {
      const p = game.player;
      if (p) {
        const d = new THREE7.Vector3().subVectors(p.mv.pos, f.mv.pos);
        f.mv.yaw = Math.atan2(-d.x, -d.z);
      }
      const inp0 = f.input;
      inp0.forward = 0;
      inp0.right = 0;
      inp0.jump = false;
      inp0.crouch = false;
      inp0.sprint = false;
      f.wantFire = false;
      return;
    }
    const t = this.target;
    const inp = f.input;
    inp.forward = 0;
    inp.right = 0;
    inp.jumpPressed = false;
    inp.crouchPressed = false;
    if (!t) {
      this.wanderAngle += (Math.random() - 0.5) * dt * 2;
      inp.forward = 1;
      inp.sprint = true;
      f.mv.yaw = this.wanderAngle;
      this.aimYaw = this.wanderAngle;
      this.aimPitch = 0;
      return;
    }
    const dist = f.mv.pos.distanceTo(t.mv.pos);
    _dir.copy(t.mv.pos).sub(f.mv.pos);
    const flat = Math.hypot(_dir.x, _dir.z);
    const wantYaw = Math.atan2(-_dir.x, -_dir.z);
    const eyeY = t.mv.pos.y + 1.1;
    const myEye = f.mv.pos.y + f.mv.height * 0.9;
    const wantPitch = Math.atan2(eyeY - myEye, flat);
    const err = (Math.random() - 0.5) * this.d.err * 0.0174;
    const turn = this.d.turn * dt;
    this.aimYaw += clampAngle(wantYaw + err - this.aimYaw) * Math.min(1, turn);
    this.aimPitch += (wantPitch + err * 0.5 - this.aimPitch) * Math.min(1, turn);
    f.mv.yaw = this.aimYaw;
    f.mv.pitch = this.aimPitch;
    const from = _v4.set(f.mv.pos.x, myEye, f.mv.pos.z);
    const dir = new THREE7.Vector3().copy(t.mv.pos).setY(eyeY).sub(from).normalize();
    const hit = game.world.physics.raycast(from, dir, dist + 0.5);
    const los = !hit || hit.dist > dist - 0.4;
    if (los) {
      this.hasSeen = true;
      this.lastSeen.copy(t.mv.pos);
      if (this.react < -0.5) this.react = this.d.react;
    } else this.react = Math.max(this.react, this.d.react * 0.6);
    const ideal = 9 + Math.random() * 6;
    if (dist > ideal) inp.forward = 1;
    else if (dist < 4.5) inp.forward = -0.6;
    inp.right = this.strafeDir * this.d.strafe * (dist < 16 ? 1 : 0.35);
    inp.sprint = dist > 8;
    inp.crouch = false;
    const ahead = new THREE7.Vector3(Math.sin(f.mv.yaw) * -1, 0, Math.cos(f.mv.yaw) * -1);
    const probe = (ang, len) => {
      const d2 = ahead.clone().applyAxisAngle(new THREE7.Vector3(0, 1, 0), ang);
      const o = _v4.set(f.mv.pos.x, f.mv.pos.y + 0.9, f.mv.pos.z);
      return game.world.physics.raycast(o, d2, len);
    };
    const fa = probe(0, 3.2);
    const fl = probe(0.6, 2.6);
    const fr = probe(-0.6, 2.6);
    if (fa) {
      inp.right += fl && !fr ? 1 : fr && !fl ? -1 : Math.random() < 0.5 ? 1 : -1;
    }
    if (fa && fa.dist < 1.6 && f.mv.grounded && this.jumpCd <= 0) {
      inp.jump = true;
      inp.jumpPressed = true;
      this.jumpCd = 0.7;
    }
    const groundAhead = (() => {
      const d3 = ahead.clone();
      const o = new THREE7.Vector3(f.mv.pos.x + d3.x * 2, f.mv.pos.y + 0.6, f.mv.pos.z + d3.z * 2);
      const down = new THREE7.Vector3(0, -1, 0);
      return game.world.physics.raycast(o, down, 4);
    })();
    if (!groundAhead && f.mv.grounded) {
      inp.right = this.strafeDir * 1;
      inp.forward = Math.max(inp.forward, 0.4);
      if (this.jumpCd <= 0 && Math.random() < 0.4) {
        inp.jump = true;
        inp.jumpPressed = true;
        this.jumpCd = 1.1;
      }
    }
    if (f.mv.grounded && f.mv.horizontalSpeed > TUNE.slideMinSpeed + 1.2 && this.slideCd <= 0 && dist > 6 && Math.random() < 0.03) {
      inp.crouch = true;
      inp.crouchPressed = true;
      this.slideCd = 1.6 + Math.random() * 2;
      setTimeout(() => {
        if (this.f.input) {
          this.f.input.jump = true;
          this.f.input.jumpPressed = true;
        }
      }, 260);
    }
    if (f.mv.sliding && f.mv.slideTime > 0.5) {
      inp.crouch = false;
    }
    if (f.mv.horizontalSpeed < 0.6 && f.mv.grounded) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 0.6) {
        inp.right = this.strafeDir;
        inp.forward = -1;
        if (this.jumpCd <= 0) {
          inp.jump = true;
          inp.jumpPressed = true;
          this.jumpCd = 1;
        }
        if (this.stuckTimer > 1.6) {
          this.stuckTimer = 0;
          this.strafeDir *= -1;
        }
      }
    } else this.stuckTimer = 0;
    const w = f.weapons[f.slot];
    if (los && this.react <= 0 && this.firePause <= 0) {
      const angErr = Math.abs(clampAngle(wantYaw - f.mv.yaw));
      const inCone = angErr < 0.035 + 1.6 / Math.max(3, dist);
      if (inCone && dist < 70) {
        if (this.fireHold <= 0) {
          this.fireHold = this.d.burst[0] + Math.random() * (this.d.burst[1] - this.d.burst[0]);
        }
      }
    }
    if (this.fireHold > 0) {
      this.fireHold -= dt;
      f.wantFire = true;
      if (this.fireHold <= 0) this.firePause = 0.18 + Math.random() * 0.5;
    } else {
      f.wantFire = false;
      if (w && w.ammo <= 0 && !w.reloading) f.requestReload = true;
    }
    f.wantAds = dist > 16 && los && this.fireHold <= 0;
    this.gear(dt, game, dist, los);
  }
  // ── utility + weapon management: bots play their whole kit ──────────────
  gear(dt, game, dist, los) {
    const f = this.f;
    this.utilCd = (this.utilCd ?? 4 + Math.random() * 8) - dt;
    const u = f.utility;
    if (this.utilCd <= 0 && u && u.canUse()) {
      const kind = u.def.stats.type;
      const hurt = f.health < f.maxHealth * 0.55;
      let use = false;
      if (kind === "throw" && !los && this.hasSeen && dist < 32) use = true;
      else if (kind === "throw" && los && dist > 9 && dist < 26 && Math.random() < 0.4) use = true;
      else if (kind === "stim" && (hurt || dist > 22)) use = true;
      else if (kind === "dash" && (dist > 14 || hurt)) use = true;
      else if ((kind === "place" || kind === "beam" || kind === "hook" || kind === "emp") && dist < 24 && Math.random() < 0.5) use = true;
      if (use) {
        game.useUtility(f);
        this.utilCd = 7 + Math.random() * 9;
      } else this.utilCd = 2 + Math.random() * 3;
    }
    const w = f.weapons[f.slot];
    if (w && !w.isMelee && w.ammo === 0 && !w.reloading) {
      if (w.reserve === 0) {
        const alt = f.weapons.secondary.ammo > 0 ? "secondary" : "melee";
        if (f.slot !== alt) game.switchSlotFor(f, alt);
      } else f.requestReload = true;
    }
    if (dist < 4.2 && f.weapons[f.slot] && !f.weapons[f.slot].isMelee && f.weapons[f.slot].ammo === 0 && f.switchTimer <= 0) {
      game.switchSlotFor(f, "melee");
    }
  }
};
function clampAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// src/game/core/Match.js
var ROUND_HP = 150;
var FIRST_TO = 5;
var Match = class {
  constructor(game, mode) {
    this.game = game;
    this.mode = mode;
    this.scoreA = 0;
    this.scoreB = 0;
    this.round = 0;
    this.phase = "countdown";
    this.timer = 3;
    this.roundTime = 0;
    this.roundLimit = 90;
    this.lastWinner = null;
    this.log = [];
  }
  get isRange() {
    return this.mode.id === "range";
  }
  begin() {
    this.scoreA = 0;
    this.scoreB = 0;
    this.round = 0;
    this.startRound(true);
  }
  startRound(first = false) {
    this.round++;
    this.phase = "countdown";
    this.timer = first ? 2.6 : 2;
    this.roundTime = 0;
    this.game.resetRound();
    this.game.emit("round", { round: this.round, phase: "countdown", scoreA: this.scoreA, scoreB: this.scoreB });
  }
  goLive() {
    this.phase = "live";
    this.game.emit("round", { round: this.round, phase: "live", scoreA: this.scoreA, scoreB: this.scoreB });
  }
  update(dt) {
    if (this.isRange) {
      this.phase = "live";
      if (this.game.player && !this.game.player.alive) this.game.respawnPlayer(1.2);
      return;
    }
    if (this.phase === "countdown") {
      this.timer -= dt;
      if (this.timer <= 0) this.goLive();
      return;
    }
    if (this.phase === "live") {
      this.roundTime += dt;
      const alive = this.game.aliveByTeam();
      if (alive.a === 0 || alive.b === 0 || this.roundTime > this.roundLimit) {
        const winner = alive.a === 0 && alive.b === 0 ? null : alive.a === 0 ? "b" : alive.b === 0 ? "a" : null;
        this.endRound(winner);
      }
      return;
    }
    if (this.phase === "roundend") {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.scoreA >= FIRST_TO || this.scoreB >= FIRST_TO) {
          this.phase = "matchend";
          this.game.emit("matchend", {
            winner: this.scoreA >= FIRST_TO ? "a" : "b",
            scoreA: this.scoreA,
            scoreB: this.scoreB,
            stats: this.game.player.stats
          });
        } else this.startRound();
      }
      return;
    }
  }
  endRound(winner) {
    this.phase = "roundend";
    this.timer = 2.6;
    this.lastWinner = winner;
    if (winner === "a") this.scoreA++;
    else if (winner === "b") this.scoreB++;
    this.log.push({ round: this.round, winner });
    this.game.emit("roundend", {
      winner,
      scoreA: this.scoreA,
      scoreB: this.scoreB,
      round: this.round,
      firstTo: FIRST_TO
    });
  }
};

// src/game/core/Game.js
var STEP = 1 / 120;
var TEAM_COLORS = { a: 7268351, b: 16747069 };
var clamp4 = (v, a, b) => v < a ? a : v > b ? b : v;
var shortAngle = (a, b) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};
var lerp2 = (a, b, t) => a + (b - a) * t;
var Fighter = class {
  constructor(game, opts) {
    this.game = game;
    this.team = opts.team;
    this.name = opts.name;
    this.isBot = !!opts.isBot;
    this.mv = new MovementController(game.world.physics);
    this.input = { forward: 0, right: 0, jump: false, crouch: false, sprint: false, jumpPressed: false, crouchPressed: false };
    this.maxHealth = ROUND_HP;
    this.health = ROUND_HP;
    this.alive = true;
    this.respawnTimer = 0;
    this.loadout = opts.loadout || { ...DEFAULT_LOADOUT };
    this.skin = opts.skin;
    this.weapons = {
      primary: new Weapon(this.loadout.primary, this.skin),
      secondary: new Weapon(this.loadout.secondary, this.skin),
      melee: new Weapon(this.loadout.melee, this.skin)
    };
    this.utility = new UtilitySlot(this.loadout.utility);
    this.slot = "primary";
    this.prevSlot = "secondary";
    this.wantFire = false;
    this.wantFirePressed = false;
    this.wantFireReleased = false;
    this.wantAds = false;
    this.requestReload = false;
    this.stats = { kills: 0, deaths: 0, damage: 0, headshots: 0, best: 0, shots: 0, hits: 0, topSpeed: 0, assists: 0 };
    this.haste = 0;
    this.slow = 0;
    this.hook = null;
    this.lastAttacker = null;
    this.flashTime = 0;
    this.hitFlash = 0;
    this.switchTimer = 0;
    this.stepPhase = 0;
    this.spawnGuard = 0;
    this.model = buildFighterModel(TEAM_COLORS[this.team], this.isBot, WEAPON_MAP[this.loadout.primary]);
    game.world.scene.add(this.model);
    this.radius = 0.42;
    this.ping = rollPing();
  }
  get weapon() {
    return this.weapons[this.slot];
  }
  get eyeY() {
    return this.mv.pos.y + this.mv.height * 0.92;
  }
  get speedMul() {
    let m = this.weapon.def.stats.speed ?? 1;
    if (this.haste > 0) m *= 1.35;
    if (this.slow > 0) m *= 0.62;
    return m;
  }
  capsule(out) {
    const p = this.mv.pos;
    out.a.set(p.x, p.y + this.radius * 0.85, p.z);
    out.b.set(p.x, p.y + this.mv.height - this.radius * 0.85, p.z);
    return out;
  }
  applyDamage(amount, from, head, dir) {
    if (!this.alive) return 0;
    if (this.spawnGuard > 0 && from && from !== this) return 0;
    const dmg = Math.round(amount);
    this.health -= dmg;
    this.hitFlash = 1;
    this.lastAttacker = from;
    if (from && from !== this) {
      this.credit = this.credit || [];
      if (!this.credit.some((c) => c.f === from)) this.credit.push({ f: from, t: this.game.time });
    }
    if (from && from !== this) from.stats.damage += dmg;
    if (this.health <= 0) {
      this.health = 0;
      this.game.killFighter(this, from, head);
    }
    if (dir) this.game.vfx.bloodPuff(new THREE8.Vector3(this.mv.pos.x, this.mv.pos.y + 1.2, this.mv.pos.z), dir);
    return dmg;
  }
  respawn(pos, yaw) {
    this.mv.reset(pos, yaw);
    for (let i = 0; i < 10 && this.game.world.physics.overlaps(this.mv.pos, this.mv.radius, this.mv.height); i++) {
      this.mv.pos.y += 0.2;
    }
    this.mv.grounded = true;
    this.health = this.maxHealth;
    this.alive = true;
    if (this.game?.netState) this.game.netState.sentKill = false;
    this.spawnGuard = this.isDummy ? 0 : 0.9;
    this.haste = 0;
    this.slow = 0;
    this.flashTime = 0;
    this.model.visible = true;
    this.slot = "primary";
    for (const k of ["primary", "secondary", "melee"]) this.weapons[k].reset(true);
    this.utility.reset();
    this.hook = null;
  }
  dispose() {
    this.game.world.scene.remove(this.model);
  }
};
var Game = class {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = opts;
    this.onHud = opts.onHud || (() => {
    });
    this.onEvent = opts.onEvent || (() => {
    });
    this.settings = opts.settings || {};
    this.running = false;
    this.time = 0;
    this.acc = 0;
    this.fps = 60;
    this._fpsAcc = 0;
    this._fpsN = 0;
    const makeRenderer = opts.rendererFactory || ((c) => new THREE8.WebGLRenderer({ canvas: c, antialias: true, powerPreference: "high-performance" }));
    this.renderer = makeRenderer(canvas);
    if ("toneMapping" in this.renderer) {
      this.renderer.toneMapping = THREE8.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.06;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.settings.quality === "high" ? 2 : 1.35));
    this.renderer.setSize(canvas.clientWidth || 1280, canvas.clientHeight || 720, false);
    this.camera = new THREE8.PerspectiveCamera(95, 16 / 9, 0.05, 600);
    this.rig = new CameraRig(this.camera);
    this.rig.baseFov = this.settings.fov ?? 95;
    this.vmScene = new THREE8.Scene();
    this.vmCamera = new THREE8.PerspectiveCamera(58, 16 / 9, 0.01, 12);
    this.vmScene.add(new THREE8.HemisphereLight(13625087, 2764600, 1.5));
    const vmLight = new THREE8.DirectionalLight(16777215, 1.4);
    vmLight.position.set(1.2, 2, 1.6);
    this.vmScene.add(vmLight);
    this.vmRoot = new THREE8.Group();
    this.vmScene.add(this.vmRoot);
    this.input = new Input();
    this.input.sensitivity = this.settings.sensitivity ?? 1;
    this.input.attach(canvas);
    this.audio = new AudioKit();
    this.audio.enabled = this.settings.sound !== false;
    this.audio.setVolume(this.settings.volume ?? 0.7);
    this.fighters = [];
    this.projectiles = [];
    this.placeables = [];
    this.lastRoundWin = null;
    this.killfeed = [];
    this.scoreboard = false;
    this.hitDirs = [];
    this.banners = [];
    this.killStreak = 0;
    this.killStreakT = 0;
    this.firstBlood = false;
    this.spectate = null;
    this.killCam = null;
    this.hitmarker = 0;
    this.plates = /* @__PURE__ */ new Map();
    this.platesEnabled = typeof document !== "undefined" && typeof document.createElement === "function";
    this.renderScale = 1;
    this.basePR = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, this.settings.quality === "high" ? 2 : 1.35);
    this._qT = 2.5;
    this._plateT = 0;
    this._pv = new THREE8.Vector3();
    this.vm = null;
    this.vmState = { sway: new THREE8.Vector2(), kick: new THREE8.Vector3(), kickVel: new THREE8.Vector3(), swing: 0, swingDir: 1, reload: 0 };
    this._cap = { a: new THREE8.Vector3(), b: new THREE8.Vector3() };
    this._from = new THREE8.Vector3();
    this._dir = new THREE8.Vector3();
    this.lastHitWasHead = false;
    this.damageFlash = 0;
    this.hudAcc = 0;
    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize);
  }
  // ── lifecycle ────────────────────────────────────────────────────────────
  load(config) {
    const { mapId, modeId, loadout, skin, botLevel, teamBots, net, netRole, peerName } = config;
    this.config = config;
    this.net = net || null;
    this.netRole = netRole || null;
    this.netState = net ? { hello: null, remoteHello: null, buf: [], slot: 0, lastHello: 0, sentKill: false } : null;
    this.netPing = 0;
    this.map = MAP_BY_ID[mapId] || MAP_BY_ID.yard;
    this.mode = MODES.find((m) => m.id === modeId) || MODES[0];
    this.skin = SKIN_MAP[skin] || SKIN_MAP.stock;
    this.world = new World(this.map);
    this.vfx = new VFX(this.world.scene);
    this.playerLoadout = loadout || { ...DEFAULT_LOADOUT };
    this.playerName = config.playerName || (this.netRole === "host" ? "HOST" : this.netRole === "guest" ? "GUEST" : "YOU");
    this.player = new Fighter(this, { team: "a", name: this.net ? this.playerName : "YOU", loadout: this.playerLoadout, skin: this.skin });
    this.fighters = [this.player];
    this.bots = [];
    if (this.mode.id === "range") {
      const spots = [[-10, 15], [-3, 15], [4, 15], [11, 15], [-6, 0], [3, 0], [-8, -20], [6, -20]];
      spots.forEach((p, i) => {
        const f = new Fighter(this, { team: "b", name: "DUMMY-" + (i + 1), isBot: true, loadout: { ...DEFAULT_LOADOUT }, skin: SKIN_MAP.stock });
        f.respawn(new THREE8.Vector3(p[0], 0.4, p[1]), Math.PI);
        f.isDummy = true;
        f.home = new THREE8.Vector3(p[0], 0.4, p[1]);
        f.homeYaw = Math.PI;
        this.fighters.push(f);
        const b = new Bot(f, "easy");
        b.dummy = true;
        this.bots.push(b);
      });
    }
    if (this.net) {
      const foe = new Fighter(this, {
        team: "b",
        name: peerName || "GUEST",
        isBot: true,
        loadout: { ...DEFAULT_LOADOUT },
        skin: SKIN_MAP.stock
      });
      foe.isRemote = true;
      foe.model.visible = false;
      this.fighters.push(foe);
      this.remote = foe;
      this.netSay(MSG.hello(this.playerName || "HOST", this.playerLoadout, skin));
    }
    const teamSize = this.net ? 0 : this.mode.teamB;
    const botsNeeded = this.net ? 0 : this.mode.bots;
    for (let i = 0; i < teamSize; i++) {
      const f = new Fighter(this, {
        team: "b",
        name: rollName(),
        isBot: true,
        loadout: randomLoadout(),
        skin: randomSkin()
      });
      this.fighters.push(f);
      this.bots.push(new Bot(f, botLevel || "normal"));
    }
    const friendlyBots = this.net ? 0 : Math.max(0, this.mode.teamA - 1);
    for (let i = 0; i < friendlyBots; i++) {
      const f = new Fighter(this, {
        team: "a",
        name: rollName(),
        isBot: true,
        loadout: randomLoadout(),
        skin: randomSkin()
      });
      this.fighters.push(f);
      this.bots.push(new Bot(f, botLevel || "normal"));
    }
    this.match = new Match(this, this.mode);
    this.buildViewModelFor("primary");
    this.spawnAll();
    this.match.begin();
    this.rig.reset(0);
    this.resize();
    this.pushHud();
    return this;
  }
  // swap weapons without restarting (shooting range)
  applyLoadout(loadout) {
    const f = this.player;
    f.loadout = { ...loadout };
    f.weapons.primary = new Weapon(loadout.primary, this.skin);
    f.weapons.secondary = new Weapon(loadout.secondary, this.skin);
    f.weapons.melee = new Weapon(loadout.melee, this.skin);
    f.utility = new UtilitySlot(loadout.utility);
    f.slot = "primary";
    this.buildViewModelFor("primary");
  }
  dispose() {
    this.stop();
    for (const p of this.plates.values()) {
      this.world.scene.remove(p.sp);
      p.sp.material.map?.dispose?.();
      p.sp.material.dispose?.();
    }
    this.plates.clear();
    window.removeEventListener("resize", this._onResize);
    if (this.world) this.world.dispose();
    this.renderer.dispose();
  }
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.vmCamera.aspect = w / h;
    this.vmCamera.updateProjectionMatrix();
  }
  setPaused(v) {
    this.paused = v;
    if (v) {
      this.hudAcc = 1;
      this.pushHud();
    }
  }
  applyRenderScale() {
    if (!this.renderer.setPixelRatio) return;
    this.renderer.setPixelRatio(this.basePR * this.renderScale);
    this.resize();
  }
  // ── nameplates over team-mates and dummies ───────────────────────────────
  plateFor(f) {
    let p = this.plates.get(f);
    if (p) return p;
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 84;
    const tex = new THREE8.CanvasTexture(c);
    const sp = new THREE8.Sprite(new THREE8.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
    sp.renderOrder = 990;
    this.world.scene.add(sp);
    p = { f, canvas: c, ctx: c.getContext("2d"), tex, sp, hp: -1, shown: true };
    this.plates.set(f, p);
    this.drawPlate(p);
    return p;
  }
  drawPlate(p) {
    const f = p.f;
    const x = p.ctx;
    const c = p.canvas;
    x.clearRect(0, 0, c.width, c.height);
    const w = 190, h = 11, x0 = (c.width - w) / 2;
    x.fillStyle = "rgba(6,9,13,.62)";
    x.fillRect(x0 - 2, 50, w + 4, h + 4);
    const pct = Math.max(0, Math.min(1, f.health / f.maxHealth));
    x.fillStyle = pct > 0.5 ? "#39d98a" : pct > 0.25 ? "#ffd166" : "#ff4d6d";
    x.fillRect(x0, 52, w * pct, h);
    x.strokeStyle = "rgba(255,255,255,.22)";
    x.strokeRect(x0 - 0.5, 51.5, w + 1, h + 1);
    x.font = "700 27px ui-monospace, SFMono-Regular, Menlo, monospace";
    x.textAlign = "center";
    x.fillStyle = f.isDummy ? "#b388ff" : f.team === "a" ? "#6ee7ff" : "#ff8a3d";
    x.fillText(f.name, c.width / 2, 38);
    p.tex.needsUpdate = true;
  }
  updatePlates(dt) {
    if (!this.platesEnabled) return;
    this._plateT -= dt;
    const check = this._plateT <= 0;
    if (check) this._plateT = 0.12;
    const eye = this.camera.position;
    for (const f of this.fighters) {
      const show = f.alive && f !== this.player && (f.team === this.player.team || f.isDummy);
      if (!show) {
        const p2 = this.plates.get(f);
        if (p2) p2.sp.visible = false;
        continue;
      }
      const d = f.mv.pos.distanceTo(eye);
      const p = this.plates.get(f) || this.plateFor(f);
      if (d > 85) {
        p.sp.visible = false;
        continue;
      }
      if (check) {
        this._pv.set(f.mv.pos.x, f.mv.pos.y + 1.85, f.mv.pos.z).sub(eye);
        const len = this._pv.length() || 1;
        this._pv.divideScalar(len);
        p.shown = !this.world.physics.raycast(eye, this._pv, len - 0.5);
      }
      p.sp.visible = p.shown && !this.scoreboard;
      if (!p.sp.visible) continue;
      p.sp.position.set(f.mv.pos.x, f.mv.pos.y + 2.1 + Math.min(0.6, d * 0.012), f.mv.pos.z);
      const s = 75e-4 * d;
      p.sp.scale.set(2.4 * s, 0.8 * s, 1);
      if (Math.abs(p.hp - f.health) > 0.9) {
        p.hp = f.health;
        this.drawPlate(p);
      }
    }
  }
  renderWorld() {
    this.renderer.render(this.world.scene, this.camera);
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(this.vmScene, this.vmCamera);
    this.renderer.autoClear = true;
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now) => {
      if (!this.running) return;
      this.frame(now);
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }
  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }
  emit(type, data) {
    this.onEvent(type, data);
  }
  // ── main loop ────────────────────────────────────────────────────────────
  frame(now) {
    const raw = (now - this.last) / 1e3;
    this.last = now;
    const dt = Math.min(0.05, raw);
    if (this.paused) {
      this.input.endFrame();
      this.renderWorld();
      this.hudAcc += dt;
      if (this.hudAcc > 1 / 20) {
        this.hudAcc = 0;
        this.pushHud();
      }
      return;
    }
    this._fpsAcc += raw;
    this._fpsN++;
    if (this._fpsAcc > 0.35) {
      this.fps = Math.round(this._fpsN / this._fpsAcc);
      this._fpsAcc = 0;
      this._fpsN = 0;
    }
    if (this.settings.adaptive !== false) {
      this._qT -= raw;
      if (this._qT <= 0) {
        this._qT = 2.5;
        if (this.fps < 45 && this.renderScale > 0.62) {
          this.renderScale = Math.max(0.6, this.renderScale - 0.15);
          this.applyRenderScale();
        } else if (this.fps > 105 && this.renderScale < 1) {
          this.renderScale = Math.min(1, this.renderScale + 0.1);
          this.applyRenderScale();
        }
      }
    }
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP && steps < 8) {
      this.fixedStep(STEP);
      this.acc -= STEP;
      steps++;
    }
    if (steps === 8) this.acc = 0;
    this.renderFrame(dt);
  }
  fixedStep(dt) {
    this.time += dt;
    const live = this.match.phase === "live";
    if (this.net) this.stepNet(dt);
    if (this.killStreakT > 0) {
      this.killStreakT -= dt;
      if (this.killStreakT <= 0) this.killStreak = 0;
    }
    for (const f of this.fighters) if (f.spawnGuard > 0) f.spawnGuard -= dt;
    for (let i = this.hitDirs.length - 1; i >= 0; i--) if ((this.hitDirs[i].t -= dt) <= 0) this.hitDirs.splice(i, 1);
    if (this.killCam) {
      this.killCam.t -= dt;
      if (this.killCam.t <= 0) this.killCam = null;
    }
    for (const b of this.bots) if (live || this.mode.id === "range") b.update(dt, this);
    for (const f of this.fighters) this.stepFighter(f, dt, live);
    this.stepProjectiles(dt);
    this.stepPlaceables(dt);
    this.vfx.update(dt);
    if (!this.net || this.netRole === "host") this.match.update(dt);
    if (this.mode.id !== "range") this.checkFallOut();
  }
  stepFighter(f, dt, live) {
    if (f.isRemote) return;
    if (!f.alive) {
      f.respawnTimer -= dt;
      if (f.respawnTimer <= 0 && (this.mode.id === "range" || f.isDummy)) this.respawnFighter(f);
      return;
    }
    if (this.mode.id === "range" && f === this.player) {
      for (const k of ["primary", "secondary", "melee"]) {
        const w2 = f.weapons[k];
        if (w2.reserve < w2.def.stats.reserve) w2.reserve = w2.def.stats.reserve;
      }
    }
    f.haste = Math.max(0, f.haste - dt);
    f.slow = Math.max(0, f.slow - dt);
    f.flashTime = Math.max(0, f.flashTime - dt);
    f.hitFlash = Math.max(0, f.hitFlash - dt * 3);
    f.switchTimer = Math.max(0, f.switchTimer - dt);
    f.mv.speedMult = f.speedMul;
    if (f === this.player) this.readPlayerInput(f, dt, live);
    else f.wantFirePressed = f.wantFire && !f._prevFire;
    f._prevFire = f.wantFire;
    const canAct = live || this.mode.id === "range";
    const w = f.weapon;
    w.update(dt, {
      speed: f.mv.horizontalSpeed,
      grounded: f.mv.grounded,
      sliding: f.mv.sliding,
      crouching: f.mv.crouching,
      wantAds: f.wantAds && canAct,
      wantFire: f.wantFire && canAct,
      t: this.time
    });
    f.utility.update(dt);
    if (canAct) {
      if (f.requestReload) {
        if (w.startReload()) this.audio.reload();
        f.requestReload = false;
      }
      const shot = w.tryFire({
        t: this.time,
        speed: f.mv.horizontalSpeed,
        grounded: f.mv.grounded,
        sliding: f.mv.sliding,
        crouching: f.mv.crouching,
        wantFire: f.wantFire,
        wantFirePressed: f.wantFirePressed,
        wantFireReleased: f.wantFireReleased
      });
      if (shot) this.fireWeapon(f, shot);
      if (!w.isMelee && w.ammo === 0 && !w.reloading && w.reserve > 0 && f !== this.player) f.requestReload = true;
    }
    if (f.hook && f.hook.active) {
      const d = new THREE8.Vector3().subVectors(f.hook.point, f.mv.pos);
      const len = d.length();
      if (len < 2.2 || f.hook.life <= 0) {
        f.hook.active = false;
        f.hook = null;
      } else {
        d.normalize();
        const pull = f.hook.pull;
        f.mv.vel.addScaledVector(d, pull * dt);
        if (f.mv.vel.y > 0) f.mv.vel.y *= 0.985;
        f.hook.life -= dt;
      }
    }
    if (f.mv.horizontalSpeed > (f.stats.topSpeed || 0)) f.stats.topSpeed = f.mv.horizontalSpeed;
    const before = f.mv.grounded;
    f.mv.step(dt, f.input);
    if (f.mv.grounded && !before && f.mv.lastFallSpeed > 4) this.audio.land(clamp4(f.mv.lastFallSpeed / 12, 0, 1));
    if (f.mv.grounded && f.mv.horizontalSpeed > 1.5) {
      f.stepPhase += f.mv.horizontalSpeed * dt;
      if (f.stepPhase > 2.4) {
        f.stepPhase = 0;
        if (f !== this.player) {
        } else if (!f.mv.sliding) this.audio.step(clamp4(f.mv.horizontalSpeed / 10, 0.2, 1));
        else this.audio.slide();
      }
    }
    if (f.mv.sliding && f === this.player && Math.random() < dt * 6) this.audio.slide();
    f.model.position.set(f.mv.pos.x, f.mv.pos.y, f.mv.pos.z);
    const visYaw = f === this.player ? this.rig.yaw : f.mv.yaw;
    f.model.rotation.y = visYaw + Math.PI;
    const squash = f.mv.sliding ? 0.55 : f.mv.crouching ? 0.72 : 1;
    f.model.scale.set(1, squash, 1);
    f.model.visible = f.alive && f !== this.player;
    if (f !== this.player) f.mv.pitch = clamp4(f.mv.pitch, -1.2, 1.2);
  }
  // ── player input ─────────────────────────────────────────────────────────
  readPlayerInput(f, dt, live) {
    const inp = this.input;
    const sens = 22e-4 * (inp.sensitivity ?? 1) * (f.weapon.ads > 0.1 ? 0.72 : 1);
    f.mv.yaw -= inp.mouse.dx * sens;
    f.mv.pitch -= inp.mouse.dy * sens * (this.settings.invertY ? -1 : 1);
    f.mv.pitch = clamp4(f.mv.pitch, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
    if (f.mv.yaw > Math.PI) f.mv.yaw -= Math.PI * 2;
    if (f.mv.yaw < -Math.PI) f.mv.yaw += Math.PI * 2;
    const m = inp.moveFrame();
    f.input.forward = m.forward;
    f.input.right = m.right;
    f.input.jump = m.jump;
    f.input.crouch = m.crouch;
    f.input.sprint = m.sprint;
    f.input.jumpPressed = m.jumpPressed;
    f.input.crouchPressed = m.crouchPressed;
    f.input.mouseDx = inp.mouse.dx;
    f.wantFire = inp.mouseButtons[0] && live;
    f.wantAds = inp.mouseButtons[2] && live;
    f.wantFirePressed = inp.mousePressed[0] && live;
    f.wantFireReleased = false;
    f.wantFireHeld = inp.mouseButtons[0];
    if (inp.hit("KeyR")) f.requestReload = true;
    if (inp.hit("Digit1")) this.switchSlot("primary");
    if (inp.hit("Digit2")) this.switchSlot("secondary");
    if (inp.hit("Digit3")) this.switchSlot("melee");
    if (inp.hit("KeyQ")) this.switchSlot(f.prevSlot);
    if (inp.hit("KeyF") || inp.hit("KeyG")) this.useUtility(f);
    if (inp.wheel) {
      const order = ["primary", "secondary", "melee"];
      const i = order.indexOf(f.slot);
      this.switchSlot(order[(i + (inp.wheel > 0 ? 1 : order.length - 1)) % order.length]);
    }
    const board = inp.down("KeyV") || inp.down("Tab");
    if (board !== this.scoreboard) {
      this.scoreboard = board;
      this.emit("scoreboard", board);
    }
  }
  switchSlot(slot) {
    this.switchSlotFor(this.player, slot);
  }
  switchSlotFor(f, slot) {
    if (!f.alive || f.slot === slot || f.switchTimer > 0) return;
    f.prevSlot = f.slot;
    f.slot = slot;
    f.switchTimer = 0.32;
    f.weapons[f.prevSlot].cancelReload();
    if (f === this.player) {
      this.buildViewModelFor(slot);
      this.audio.beep();
    }
  }
  useUtility(f) {
    const u = f.utility;
    if (!u.canUse()) return;
    const s = u.def.stats;
    if (s.type === "throw") {
      const dir = this.aimDir(f);
      const from = this.aimOrigin(f).addScaledVector(dir, 0.5);
      this.spawnProjectile({
        pos: from,
        vel: dir.clone().multiplyScalar(22).add(new THREE8.Vector3(f.mv.vel.x * 0.5, 2.5, f.mv.vel.z * 0.5)),
        def: u.def,
        owner: f,
        fuse: s.fuse,
        bounce: 0.32,
        grav: 20,
        radius: 0.22
      });
      this.audio.ui(true);
    } else if (s.type === "self") {
      if (s.heal) f.health = Math.min(f.maxHealth, f.health + s.heal);
      if (s.haste) f.haste = s.hasteTime;
      if (s.impulse) {
        const dir = new THREE8.Vector3(-Math.sin(f.mv.yaw), 0, -Math.cos(f.mv.yaw));
        if (f.input.forward < 0) dir.multiplyScalar(-1);
        const side = new THREE8.Vector3(Math.cos(f.mv.yaw), 0, -Math.sin(f.mv.yaw)).multiplyScalar(f.input.right);
        dir.add(side).normalize();
        f.mv.vel.x += dir.x * s.impulse;
        f.mv.vel.z += dir.z * s.impulse;
        f.mv.vel.y = Math.max(f.mv.vel.y, 2.4);
      }
      this.vfx.burst(new THREE8.Vector3(f.mv.pos.x, f.mv.pos.y + 1, f.mv.pos.z), 14, s.color, 4, 0.1, 0.5, 6);
      this.audio.beep();
    } else if (s.type === "hook") {
      const dir = this.aimDir(f);
      this.spawnProjectile({
        pos: this.aimOrigin(f).addScaledVector(dir, 0.5),
        vel: dir.clone().multiplyScalar(70),
        def: u.def,
        owner: f,
        fuse: 1.4,
        grav: 0,
        radius: 0.12,
        hook: true
      });
      this.audio.melee();
    } else if (s.type === "place") {
      const dir = this.aimDir(f);
      const origin = this.aimOrigin(f);
      const hit = this.world.physics.raycast(origin, dir, 8);
      const p = hit ? hit.point.clone() : origin.clone().addScaledVector(dir, 3);
      p.y = Math.max(this.map.killY ?? -20, p.y);
      if (u.def.id === "barrier") this.placeBarrier(p, f);
      else this.placeMine(p, f);
      this.audio.ui(true);
    }
    u.consume();
  }
  // ── feedback helpers ─────────────────────────────────────────────────────
  banner(text, kind = "info", time = 1.7) {
    this.banners.push({ id: "b" + (this._bid = (this._bid || 0) + 1), text, kind, t: time });
    if (this.banners.length > 3) this.banners.shift();
  }
  addHitDir(fromPos) {
    const p = this.player;
    const dx = fromPos.x - p.mv.pos.x;
    const dz = fromPos.z - p.mv.pos.z;
    const fx = -Math.sin(p.mv.yaw), fz = -Math.cos(p.mv.yaw);
    const ang = Math.atan2(dx * -fz + dz * fx, dx * fx + dz * fz);
    this.hitDirs.push({ id: "h" + (this._bid = (this._bid || 0) + 1), ang, t: 1.15 });
    if (this.hitDirs.length > 6) this.hitDirs.shift();
  }
  // while you are dead the camera rides along — first with your killer, then a team-mate
  spectateTarget() {
    const p = this.player;
    if (p.alive) {
      this.spectate = null;
      return null;
    }
    if (this.net) return null;
    if (this.killCam && this.killCam.t > 0 && this.killCam.target && this.killCam.target.alive && this.killCam.target !== p) {
      this.spectate = this.killCam.target;
      return this.spectate;
    }
    let t = this.spectate;
    if (!t || !t.alive || t === p) {
      t = this.fighters.find((x) => x.alive && x.team === p.team && x !== p) || this.fighters.find((x) => x.alive && x !== p) || null;
    }
    this.spectate = t;
    return t;
  }
  // ══ netplay ═══════════════════════════════════════════════════════════════
  netSay(msg) {
    if (this.net && this.net.open) this.net.send(msg);
  }
  stepNet(dt) {
    const net = this.net;
    const st = this.netState;
    if (!net || !st) return;
    net.tick(dt);
    this.netPing = net.ping;
    if (this.netRole === "host" && !st.remoteHello) {
      st.mapT = (st.mapT || 0) - dt;
      if (st.mapT <= 0) {
        st.mapT = 0.4;
        this.netSay(MSG.ready(this.config.mapId, this.config.modeId));
      }
    }
    st.lastHello -= dt;
    if (st.lastHello <= 0) {
      st.lastHello = 1;
      this.netSay(MSG.hello(this.playerName || (this.netRole === "host" ? "HOST" : "GUEST"), this.playerLoadout, this.skin?.id));
    }
    for (const m of net.receive()) this.onNetMessage(m);
    st.snapT = (st.snapT || 0) - dt;
    if (st.snapT <= 0 && this.player) {
      st.snapT = 1 / 30;
      const f = this.player;
      let flags = 0;
      if (f.mv.grounded) flags |= FLAG.grounded;
      if (f.mv.sliding) flags |= FLAG.sliding;
      if (f.mv.sprinting) flags |= FLAG.sprinting;
      if (f.mv.crouching) flags |= FLAG.crouching;
      if (f.alive) flags |= FLAG.alive;
      if (f.wantFire) flags |= FLAG.firing;
      if (f.weapon.reloading) flags |= FLAG.reloading;
      this.netSay(MSG.snapshot(performance.now(), f.mv, flags, f.health, f.slot, f.weapon.isMelee ? 0 : f.weapon.ammo));
    }
    if (this.netRole === "host" && this.match) {
      st.matchT = (st.matchT || 0) - dt;
      if (st.matchT <= 0) {
        st.matchT = 0.1;
        this.netSay(MSG.match(this.match.phase, this.match.round, this.match.scoreA, this.match.scoreB, this.match.timer));
      }
    }
  }
  onNetMessage(m) {
    const st = this.netState;
    const r = this.remote;
    switch (m[0]) {
      case "l": {
        if (st.remoteHello && st.remoteHello.name === m[1]) break;
        st.remoteHello = { name: m[1], loadout: m[2], skin: m[3] };
        if (r) {
          r.name = m[1];
          r.loadout = { ...DEFAULT_LOADOUT, ...m[2] || {} };
          r.skin = SKIN_MAP[m[3]] || SKIN_MAP.stock;
          if (r.model) {
            this.world.scene.remove(r.model);
            r.model.traverse?.((o) => {
              if (o.isMesh && o.geometry) o.geometry.dispose?.();
            });
          }
          r.model = buildFighterModel(TEAM_COLORS.b, true, WEAPON_MAP[r.loadout.primary]);
          this.world.scene.add(r.model);
          for (const k of ["primary", "secondary", "melee"]) r.weapons[k] = new Weapon(r.loadout[k], r.skin);
          r.utility = new UtilitySlot(r.loadout.utility);
        }
        this.banner("CONNECTED \u2014 " + m[1], "good", 2);
        break;
      }
      case "s": {
        if (!r) break;
        st.buf.push({
          t: performance.now(),
          p: [m[2], m[3], m[4]],
          v: [m[5], m[6], m[7]],
          yaw: m[8],
          pitch: m[9],
          flags: m[10],
          hp: m[11],
          slot: m[12],
          ammo: m[13],
          spd: m[14]
        });
        if (st.buf.length > 40) st.buf.shift();
        break;
      }
      case "d": {
        if (!this.player || !this.player.alive) break;
        const from = this.remote;
        const before = this.player.health;
        this.player.spawnGuard = 0;
        this.player.health = Math.max(0, this.player.health - m[1]);
        from.stats.damage += m[1];
        this.damageFlash = 1;
        this.rig.addShake(0.5);
        this.audio.hurt();
        if (from) this.addHitDir(from.mv.pos);
        if (this.player.health <= 0) this.killFighter(this.player, from, !!m[2]);
        if (before !== this.player.health) this.emit("damage", { amount: -m[1], head: !!m[2], speed: 0 });
        break;
      }
      case "k": {
        if (!r) break;
        const killerIsMe = m[1] === this.player.name;
        const victimIsMe = m[2] === this.player.name;
        if (victimIsMe) this.killFighter(this.player, r, !!m[3]);
        else if (killerIsMe) {
          this.killFighter(r, this.player, !!m[3]);
        } else this.killFighter(r, null, !!m[3]);
        break;
      }
      case "f": {
        const from = new THREE8.Vector3(m[1], m[2], m[3]);
        const dir = new THREE8.Vector3(m[4], m[5], m[6]);
        const hit = this.world.physics.raycast(from, dir, 200);
        const end = hit ? hit.point : from.clone().addScaledVector(dir, 120);
        this.vfx.tracer(from.clone(), end, 16766624, 0.02, 0.07);
        const d = from.distanceTo(this.camera.position);
        const def = WEAPON_MAP[m[7]];
        if (def) this.audio.shot({
          pitch: def.stats.pellets ? 0.7 : 1.05 - (def.stats.dmg ?? 20) / 400,
          len: def.stats.pellets ? 0.28 : 0.14,
          gain: Math.max(0.05, 0.42 - d / 90),
          body: def.stats.pellets ? 110 : 200 - (def.stats.dmg ?? 20)
        });
        break;
      }
      case "m": {
        if (this.netRole === "host" || !this.match) break;
        const [phase, round, scoreA, scoreB, timer] = [m[1], m[2], m[3], m[4], m[5]];
        if (phase === "countdown" && this.match.phase !== "countdown") {
          this.match.round = round;
          this.match.startRound();
        } else if (phase === "live" && this.match.phase !== "live") {
          this.match.goLive();
        } else if (phase === "roundend" && this.match.phase !== "roundend") {
          this.match.endRound(scoreA > this.match.scoreA ? "a" : scoreB > this.match.scoreB ? "b" : null);
        } else if (phase === "matchend" && this.match.phase !== "matchend") {
          this.match.phase = "matchend";
          this.emit("matchend", { winner: scoreA > scoreB ? "a" : "b", scoreA, scoreB, stats: this.player.stats, board: [] });
        }
        this.match.scoreA = scoreA;
        this.match.scoreB = scoreB;
        this.match.timer = timer;
        this.match.round = round;
        break;
      }
      case "x":
        this.banner("THE OTHER PLAYER LEFT", "bad", 2.4);
        this.emit("peerleft", {});
        break;
      default:
        break;
    }
  }
  // Render the remote fighter a hair in the past and slide between samples,
  // so a 30 Hz link still looks like a smooth 60+ fps player.
  interpolateRemote() {
    const st = this.netState;
    const r = this.remote;
    if (!st || !r || st.buf.length === 0) return;
    const now = performance.now();
    const renderAt = now - 90;
    let a = st.buf[0], b = st.buf[0];
    for (let i = 0; i < st.buf.length; i++) {
      if (st.buf[i].t <= renderAt) a = st.buf[i];
      if (st.buf[i].t >= renderAt) {
        b = st.buf[i];
        break;
      }
    }
    const span = b.t - a.t;
    let k = span > 0 ? (renderAt - a.t) / span : 1;
    let ex = 0;
    if (k > 1) {
      ex = Math.min(0.12, (now - b.t) / 1e3);
      k = 1;
    }
    const lerp3 = (i) => a.p[i] + (b.p[i] - a.p[i]) * k + (b.v[i] || 0) * ex;
    r.mv.pos.set(lerp3(0), lerp3(1), lerp3(2));
    r.mv.vel.set(b.v[0], b.v[1], b.v[2]);
    r.mv.yaw = a.yaw + shortAngle(a.yaw, b.yaw) * k;
    r.mv.pitch = a.pitch + (b.pitch - a.pitch) * k;
    r.mv.grounded = !!(b.flags & FLAG.grounded);
    r.mv.sliding = !!(b.flags & FLAG.sliding);
    r.mv.crouching = !!(b.flags & FLAG.crouching);
    r.mv.sprinting = !!(b.flags & FLAG.sprinting);
    const wasAlive = r.alive;
    r.alive = !!(b.flags & FLAG.alive);
    r.health = b.hp;
    r.slot = ["primary", "secondary", "melee"].includes(b.slot) ? b.slot : "primary";
    if (wasAlive && !r.alive) this.vfx.burst(new THREE8.Vector3(r.mv.pos.x, r.mv.pos.y + 1, r.mv.pos.z), 20, 16731501, 6, 0.13, 0.9, 14);
    r.model.visible = r.alive;
    r.model.position.set(r.mv.pos.x, r.mv.pos.y, r.mv.pos.z);
    r.model.rotation.y = r.mv.yaw + Math.PI;
    const squash = r.mv.sliding ? 0.55 : r.mv.crouching ? 0.72 : 1;
    r.model.scale.set(1, squash, 1);
    if (b.flags & FLAG.firing) {
      const mz = r.model.userData.muzzle;
      if (mz) {
        const p = new THREE8.Vector3();
        mz.getWorldPosition(p);
        this.vfx.muzzle(p, new THREE8.Vector3(-Math.sin(r.mv.yaw), 0, -Math.cos(r.mv.yaw)), 0.8, 16767392);
      }
    }
  }
  // ── aiming & shooting ────────────────────────────────────────────────────
  aimOrigin(f) {
    const o = new THREE8.Vector3(f.mv.pos.x, f.eyeY, f.mv.pos.z);
    if (f === this.player) o.set(this.camera.position.x, this.camera.position.y, this.camera.position.z);
    return o;
  }
  aimDir(f) {
    const yaw = f === this.player ? this.rig.yaw : f.mv.yaw;
    const pitch = f === this.player ? this.rig.pitch : f.mv.pitch;
    const cp = Math.cos(pitch);
    return new THREE8.Vector3(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
  }
  fireWeapon(f, shot) {
    const def = shot.def;
    const s = def.stats;
    const origin = this.aimOrigin(f);
    const baseDir = this.aimDir(f);
    const speed = f.mv.horizontalSpeed;
    const mom = momentumScale(speed, shot.kind === "melee" ? "melee" : "gun");
    const isPlayer = f === this.player;
    if (shot.kind === "melee") {
      this.vmState.swing = 1;
      this.vmState.swingDir *= -1;
      this.audio.melee();
      let hitAny = false;
      for (const e of this.fighters) {
        if (!e.alive || e === f) continue;
        if (e.team === f.team && this.mode.id !== "range") continue;
        const d = e.mv.pos.distanceTo(f.mv.pos);
        if (d > s.reach) continue;
        const to = new THREE8.Vector3().subVectors(e.mv.pos, f.mv.pos).normalize();
        const flat = new THREE8.Vector3(to.x, 0, to.z);
        const bf = new THREE8.Vector3(baseDir.x, 0, baseDir.z);
        if (flat.dot(bf) < 0.35) continue;
        const facing = new THREE8.Vector3(-Math.sin(e.mv.yaw), 0, -Math.cos(e.mv.yaw));
        const behind = facing.dot(to) < -0.1;
        let dmg = s.dmg * mom * (behind ? s.back ?? 1.3 : 1);
        this.damageTarget(e, dmg, f, false, baseDir, isPlayer);
        if (s.knock) {
          e.mv.vel.addScaledVector(to, s.knock);
          e.mv.vel.y += 2.2;
        }
        hitAny = true;
      }
      if (hitAny && isPlayer) this.hitmarker = 0.25;
      return;
    }
    const muzzleWorld = new THREE8.Vector3();
    if (isPlayer && this.vm?.muzzle) this.vm.muzzle.getWorldPosition(muzzleWorld);
    else muzzleWorld.copy(origin).addScaledVector(baseDir, 0.6);
    if (!s.silent) {
      this.vfx.muzzle(muzzleWorld, baseDir, s.type === "hitscan" ? 1 : 1.4, 16767392);
      this.audio.shot({
        pitch: s.pellets ? 0.7 : s.type === "projectile" ? 1.5 : 1.05 - (s.dmg ?? 20) / 400,
        len: s.pellets ? 0.28 : 0.14,
        gain: s.pellets ? 0.6 : 0.42,
        body: s.pellets ? 110 : 200 - (s.dmg ?? 20)
      });
    }
    f.spawnGuard = 0;
    f.stats.shots = (f.stats.shots || 0) + (s.pellets ? 1 : 1);
    if (isPlayer) {
      this.rig.addRecoil((s.recoil?.v ?? 1) * (1 - f.weapon.ads * 0.35), s.recoil?.h ?? 0.3);
      this.vmState.kickVel.z += (s.recoil?.kick ?? 0.04) * 60;
      this.vmState.kickVel.x += (s.recoil?.v ?? 1) * 0.06;
    }
    const spreadRad = shot.spread * Math.PI / 180;
    if (s.type === "projectile") {
      const dir = jitter(baseDir, spreadRad);
      this.spawnProjectile({
        pos: muzzleWorld.clone(),
        vel: dir.multiplyScalar(s.projSpeed),
        def,
        owner: f,
        fuse: 4,
        grav: 0,
        radius: 0.18,
        bounces: s.bounces ?? 0,
        dmg: shot.dmg,
        splash: s.splash
      });
      return;
    }
    for (let i = 0; i < shot.pellets; i++) {
      const dir = jitter(baseDir, spreadRad);
      if (s.type === "beam") {
        const hit2 = this.raycastAll(f, origin, dir, s.range ?? 120);
        const end = hit2.point;
        this.vfx.beam(muzzleWorld, end, s.beamColor ?? 11766015, 0.06 + shot.charge * 0.05);
        if (hit2.fighter) {
          const dist2 = origin.distanceTo(hit2.point);
          const dmg = shot.dmg * mom * f.weapon.falloffMul(dist2) * (hit2.head ? s.head ?? 1.5 : 1);
          this.damageTarget(hit2.fighter, dmg, f, hit2.head, dir, isPlayer);
        }
        continue;
      }
      const hit = this.raycastAll(f, origin, dir, s.range ?? 120);
      const dist = origin.distanceTo(hit.point);
      if (this.net && isPlayer && i === 0) this.netSay(MSG.shot(muzzleWorld.x, muzzleWorld.y, muzzleWorld.z, dir.x, dir.y, dir.z, def.id));
      if (!s.silent) this.vfx.tracer(muzzleWorld, hit.point, f.team === "a" ? 12578815 : 16766624, 0.02, s.pellets ? 0.05 : 0.075);
      if (hit.fighter) {
        const dmg = shot.dmg * mom * f.weapon.falloffMul(dist) * (hit.head ? s.head ?? 1.5 : 1);
        this.damageTarget(hit.fighter, dmg, f, hit.head, dir, isPlayer);
      } else {
        this.vfx.impact(hit.point, hit.normal, 13621475, s.pellets ? 3 : 6);
      }
    }
  }
  raycastAll(shooter, origin, dir, maxDist) {
    const world = this.world.physics.raycast(origin, dir, maxDist);
    let best = world ? { dist: world.dist, point: world.point, normal: world.normal, fighter: null, head: false } : { dist: maxDist, point: origin.clone().addScaledVector(dir, maxDist), normal: dir.clone().negate(), fighter: null, head: false };
    const cap = this._cap;
    for (const e of this.fighters) {
      if (!e.alive || e === shooter) continue;
      if (e.team === shooter.team && this.mode.id !== "range") continue;
      e.capsule(cap);
      const t = THREE8.Object3D ? PhysicsRayCapsule(origin, dir, cap.a, cap.b, e.radius) : null;
      if (t === null || t === void 0 || t > best.dist) continue;
      const point = origin.clone().addScaledVector(dir, t);
      const head = point.y > e.mv.pos.y + e.mv.height * 0.76;
      best = { dist: t, point, normal: dir.clone().negate(), fighter: e, head };
    }
    return best;
  }
  damageTarget(target, dmg, from, head, dir, isPlayer) {
    if (this.net && target.isRemote && from === this.player) {
      dmg = Math.round(dmg);
      this.netSay(MSG.damage(dmg, head, Math.max(0, target.health - dmg)));
      this.hitmarker = 0.22;
      this.lastHitWasHead = head;
      if (head) this.audio.headshot();
      else this.audio.hit();
      this.emit("damage", { amount: dmg, head, speed: from.mv.horizontalSpeed });
      return;
    }
    const applied = target.applyDamage(dmg, from, head, dir);
    if (from && applied > 0) from.stats.hits = (from.stats.hits || 0) + 1;
    if (isPlayer) {
      this.hitmarker = 0;
      this.hitmarker = 0.22;
      this.lastHitWasHead = head;
      if (head) this.audio.headshot();
      else this.audio.hit();
      this.emit("damage", { amount: applied, head, speed: from.mv.horizontalSpeed });
    }
    if (target === this.player) {
      this.damageFlash = 1;
      this.rig.addShake(0.5);
      this.audio.hurt();
      if (from && from !== this.player) this.addHitDir(from.mv.pos);
    }
  }
  killFighter(victim, killer, head) {
    if (!victim.alive) return;
    const helpers = (victim.credit || []).filter((c) => c.f !== killer && c.f !== victim && this.time - c.t < 5);
    for (const h of helpers) {
      h.f.stats.assists = (h.f.stats.assists || 0) + 1;
      if (h.f === this.player) this.banner("ASSIST", "good", 1.2);
    }
    victim.credit = [];
    victim.alive = false;
    if (this.net && victim === this.player && !this.netState.sentKill) {
      this.netState.sentKill = true;
      this.netSay(MSG.kill(killer ? killer.name : "THE VOID", victim.name, head, killer ? killer.weapon.def.name : null));
    }
    victim.stats.deaths++;
    victim.model.visible = false;
    victim.respawnTimer = 999;
    this.vfx.burst(new THREE8.Vector3(victim.mv.pos.x, victim.mv.pos.y + 1, victim.mv.pos.z), 20, 16731501, 6, 0.13, 0.9, 14);
    if (killer && killer !== victim) {
      killer.stats.kills++;
      if (head) killer.stats.headshots++;
    }
    const entry = {
      id: Math.random().toString(36).slice(2),
      killer: killer ? killer.name : "THE VOID",
      victim: victim.name,
      weapon: killer ? killer.weapon.def.name : null,
      head: !!head,
      teamKill: killer && killer.team === victim.team,
      mine: killer === this.player,
      t: this.time
    };
    this.killfeed.push(entry);
    if (this.killfeed.length > 6) this.killfeed.shift();
    if (killer === this.player) {
      this.killStreak++;
      this.killStreakT = 3.4;
      if (!this.firstBlood) {
        this.firstBlood = true;
        this.banner("FIRST BLOOD", "good", 1.9);
      }
      const ks = this.killStreak;
      if (ks === 2) this.banner("DOUBLE KILL", "good");
      else if (ks === 3) this.banner("TRIPLE KILL", "good");
      else if (ks === 4) this.banner("QUAD KILL", "good");
      else if (ks >= 5) this.banner("RAMPAGE \xD7" + ks, "good", 2.1);
      else if (entry.head) this.banner("HEADSHOT", "good", 1.2);
      this.audio.kill();
      this.emit("kill", entry);
    } else if (victim === this.player) {
      this.killStreak = 0;
      this.killCam = killer && killer !== victim ? { target: killer, t: 2.2 } : null;
      this.emit("death", { killer: killer ? killer.name : "THE VOID" });
    }
    this.emit("killfeed", this.killfeed.slice());
  }
  // ── projectiles ──────────────────────────────────────────────────────────
  spawnProjectile(p) {
    const mesh = new THREE8.Mesh(
      p.hook ? new THREE8.ConeGeometry(0.06, 0.3, 5) : new THREE8.IcosahedronGeometry(p.radius, 0),
      new THREE8.MeshLambertMaterial({ color: p.def.stats.color ?? 9425231, flatShading: true, emissive: p.def.model?.glow ? p.def.stats.color ?? 9425231 : 0 })
    );
    mesh.position.copy(p.pos);
    this.world.scene.add(mesh);
    const proj = {
      ...p,
      mesh,
      life: p.fuse ?? 3,
      vel: p.vel.clone(),
      prev: p.pos.clone(),
      dmg: p.dmg ?? p.def.stats.dmg ?? 0,
      bounces: p.bounces ?? 0
    };
    this.projectiles.push(proj);
    return proj;
  }
  stepProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.prev.copy(p.pos);
      if (p.grav) p.vel.y -= p.grav * dt;
      p.pos.addScaledVector(p.vel, dt);
      p.life -= dt;
      p.mesh.position.copy(p.pos);
      p.mesh.rotation.x += dt * 8;
      p.mesh.rotation.z += dt * 6;
      const seg = new THREE8.Vector3().subVectors(p.pos, p.prev);
      const len = seg.length();
      let hit = null;
      if (len > 1e-3) {
        const dir = seg.clone().divideScalar(len);
        hit = this.world.physics.raycast(p.prev, dir, len + p.radius);
      }
      const cap = this._cap;
      for (const e of this.fighters) {
        if (!e.alive) continue;
        e.capsule(cap);
        const t = PhysicsRayCapsule(p.prev, seg.clone().normalize(), cap.a, cap.b, e.radius + p.radius);
        if (t !== null && t <= len && (!hit || t < hit.dist)) {
          hit = { dist: t, point: p.prev.clone().addScaledVector(seg.clone().normalize(), t), entity: e };
        }
      }
      if (hit) {
        if (p.hook) {
          if (p.owner) p.owner.hook = { point: hit.point.clone(), active: true, pull: p.def.stats.pull ?? 30, life: 0.9 };
          this.removeProjectile(i);
          continue;
        }
        if (p.bounces > 0) {
          p.bounces--;
          const n = hit.normal || new THREE8.Vector3(0, 1, 0);
          p.vel.reflect(n).multiplyScalar(0.9);
          p.pos.copy(hit.point).addScaledVector(n, p.radius + 0.02);
          this.vfx.impact(hit.point, n, p.def.stats.color ?? 9425231, 5);
          continue;
        }
        this.detonate(p, hit);
        this.removeProjectile(i);
        continue;
      }
      if (p.life <= 0) {
        this.detonate(p, null);
        this.removeProjectile(i);
      }
    }
  }
  removeProjectile(i) {
    const p = this.projectiles[i];
    this.world.scene.remove(p.mesh);
    p.mesh.geometry.dispose();
    p.mesh.material.dispose();
    this.projectiles.splice(i, 1);
  }
  detonate(p, hit) {
    const s = p.def.stats;
    const at = hit ? hit.point : p.pos.clone();
    if (p.def.id === "decoy") {
      this.spawnDecoy(p.owner, at);
      this.audio.ui(true);
      return;
    }
    if (s.flash) {
      for (const e of this.fighters) {
        if (!e.alive) continue;
        const d = e.mv.pos.distanceTo(at);
        if (d < s.radius) {
          const dir = new THREE8.Vector3().subVectors(e.mv.pos, at).normalize();
          const los = !this.world.physics.raycast(new THREE8.Vector3(e.mv.pos.x, e.eyeY, e.mv.pos.z), dir.multiplyScalar(-1), d);
          if (los) e.flashTime = s.flash * (1 - d / s.radius);
        }
      }
      this.vfx.explosion(at, s.radius * 0.5, s.color);
      this.audio.explode();
      return;
    }
    if (s.smoke) {
      for (let i = 0; i < 16; i++) {
        const off = new THREE8.Vector3((Math.random() - 0.5) * s.radius, Math.random() * 1.6, (Math.random() - 0.5) * s.radius);
        this.vfx.smokePuff(at.clone().add(off), 1.6 + Math.random(), s.color, s.smoke);
      }
      this.audio.ui(false);
      return;
    }
    if (s.dmg || p.dmg) {
      this.vfx.explosion(at, s.radius ?? 4, s.color ?? 16752970);
      this.audio.explode();
      for (const e of this.fighters) {
        if (!e.alive) continue;
        const d = e.mv.pos.distanceTo(at);
        if (d > (s.radius ?? 4)) continue;
        const falloff = 1 - d / (s.radius ?? 4);
        const dir = new THREE8.Vector3().subVectors(e.mv.pos, at).normalize();
        const dmg = (s.dmg ?? p.dmg) * falloff * (s.slow ? 1 : 1);
        this.damageTarget(e, dmg, p.owner, false, dir, p.owner === this.player);
        e.mv.vel.addScaledVector(dir, 9 * falloff);
        e.mv.vel.y += 4 * falloff;
        if (s.slow) {
          e.slow = s.slowTime;
        }
      }
      return;
    }
    this.vfx.burst(at, 8, s.color ?? 16777215, 3, 0.1, 0.4);
  }
  // ── placeables ───────────────────────────────────────────────────────────
  placeBarrier(p, f) {
    const yaw = f === this.player ? this.rig.yaw : f.mv.yaw;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const center = [p.x - s * 0.12, p.y + 1.1, p.z - c * 0.12];
    const brush = { center, half: [1.6, 1.1, 0.22], rot: [0, yaw, 0], color: 10320895, tag: "barrier" };
    this.world.physics.add(brush);
    this.world.physics.build();
    const mesh = new THREE8.Mesh(
      new THREE8.BoxGeometry(3.2, 2.2, 0.44),
      new THREE8.MeshLambertMaterial({ color: 10320895, flatShading: true, transparent: true, opacity: 0.55, emissive: 2760522 })
    );
    mesh.position.set(center[0], center[1], center[2]);
    mesh.rotation.y = yaw;
    this.world.scene.add(mesh);
    this.placeables.push({ kind: "barrier", hp: 250, brush, mesh, life: 22 });
  }
  placeMine(p, f) {
    const mesh = new THREE8.Mesh(
      new THREE8.IcosahedronGeometry(0.22, 0),
      new THREE8.MeshLambertMaterial({ color: 16731501, flatShading: true, emissive: 5574680 })
    );
    mesh.position.copy(p);
    mesh.position.y += 0.12;
    this.world.scene.add(mesh);
    this.placeables.push({ kind: "mine", mesh, pos: mesh.position.clone(), arm: 0.8, life: 40, owner: f });
  }
  spawnDecoy(owner, at) {
    const g = buildCharacter(TEAM_COLORS[owner.team], true);
    g.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.55;
      }
    });
    g.position.copy(at);
    this.world.scene.add(g);
    const dir = new THREE8.Vector3(-Math.sin(owner.mv.yaw), 0, -Math.cos(owner.mv.yaw));
    this.placeables.push({ kind: "decoy", mesh: g, pos: at.clone(), vel: dir.multiplyScalar(7), life: 8, owner, decoy: true });
  }
  stepPlaceables(dt) {
    for (let i = this.placeables.length - 1; i >= 0; i--) {
      const p = this.placeables[i];
      p.life -= dt;
      if (p.kind === "mine") {
        p.arm -= dt;
        if (p.arm <= 0) {
          for (const e of this.fighters) {
            if (!e.alive || e === p.owner) continue;
            if (e.mv.pos.distanceTo(p.pos) < 1.7) {
              this.vfx.explosion(p.pos.clone(), 4, 16731501);
              this.audio.explode();
              for (const t of this.fighters) {
                if (!t.alive) continue;
                const d = t.mv.pos.distanceTo(p.pos);
                if (d < 4.2) this.damageTarget(t, 95 * (1 - d / 4.2), p.owner, false, new THREE8.Vector3(0, 1, 0), p.owner === this.player);
              }
              this.world.scene.remove(p.mesh);
              this.placeables.splice(i, 1);
              break;
            }
          }
        }
        continue;
      }
      if (p.kind === "decoy") {
        p.pos.addScaledVector(p.vel, dt);
        const down = this.world.physics.raycast(p.pos.clone().setY(p.pos.y + 1), new THREE8.Vector3(0, -1, 0), 4);
        if (down) p.pos.y = down.point.y;
        p.mesh.position.copy(p.pos);
        p.mesh.rotation.y = Math.atan2(-p.vel.x, -p.vel.z);
        if (p.life <= 0) {
          this.world.scene.remove(p.mesh);
          this.placeables.splice(i, 1);
        }
        continue;
      }
      if (p.kind === "barrier") {
        if (p.life <= 0 || p.hp <= 0) {
          this.world.scene.remove(p.mesh);
          const idx = this.world.physics.brushes.indexOf(p.brush);
          if (idx >= 0) {
            this.world.physics.brushes.splice(idx, 1);
            this.world.physics.build();
          }
          this.placeables.splice(i, 1);
        }
      }
    }
  }
  // ── rounds ───────────────────────────────────────────────────────────────
  spawnPointFor(team, i) {
    const list = this.map.spawns[team] || this.map.spawns.a;
    return list[i % list.length];
  }
  spawnAll() {
    let ia = 0, ib = 0;
    for (const f of this.fighters) {
      if (f.isRemote) continue;
      if (f.isDummy && f.home) {
        f.respawn(f.home.clone(), f.homeYaw);
        continue;
      }
      const sp = f.team === "a" ? this.spawnPointFor("a", ia++) : this.spawnPointFor("b", ib++);
      f.respawn(new THREE8.Vector3(sp[0], sp[1] + 0.2, sp[2]), sp[3] ?? 0);
    }
  }
  resetRound() {
    for (const p of [...this.projectiles]) this.removeProjectile(this.projectiles.indexOf(p));
    for (const p of this.placeables) {
      this.world.scene.remove(p.mesh);
      if (p.brush) {
        const idx = this.world.physics.brushes.indexOf(p.brush);
        if (idx >= 0) {
          this.world.physics.brushes.splice(idx, 1);
          this.world.physics.build();
        }
      }
    }
    this.placeables.length = 0;
    this.vfx.clear();
    this.killfeed.length = 0;
    this.spawnAll();
    this.rig.dip = this.rig.dipVel = 0;
    this.vmState.swing = 0;
    if (this.player) {
      this.player.slot = "primary";
      this.buildViewModelFor("primary");
    }
  }
  respawnFighter(f) {
    if (f.isRemote) return;
    if (f.isDummy && f.home) {
      f.respawn(f.home.clone(), f.homeYaw);
      return;
    }
    const team = f.team;
    const list = this.map.spawns[team] || this.map.spawns.a;
    const sp = list[Math.floor(Math.random() * list.length)];
    let p = new THREE8.Vector3(sp[0], sp[1] + 0.2, sp[2]);
    for (let i = 0; i < 6; i++) {
      const clash = this.fighters.some((o) => o !== f && o.alive && o.mv.pos.distanceTo(p) < 1.6);
      if (!clash) break;
      p = new THREE8.Vector3(list[Math.floor(Math.random() * list.length)].slice(0, 3).reduce((v, c, k) => k === 1 ? v : v, new THREE8.Vector3()));
      const sp2 = list[Math.floor(Math.random() * list.length)];
      p = new THREE8.Vector3(sp2[0], sp2[1] + 0.2, sp2[2]);
    }
    f.respawn(p, sp[3] ?? 0);
  }
  respawnPlayer(delay = 2) {
    this.player.respawnTimer = delay;
    this.player.alive = false;
    this.player.model.visible = false;
  }
  aliveByTeam() {
    const r = { a: 0, b: 0 };
    for (const f of this.fighters) if (f.alive) r[f.team]++;
    return r;
  }
  checkFallOut() {
    const ky = this.map.killY ?? -25;
    for (const f of this.fighters) {
      if (f.isRemote) continue;
      if (f.alive && f.mv.pos.y < ky) {
        this.killFighter(f, f.lastAttacker, false);
        if (f === this.player) this.emit("fell", {});
      }
    }
  }
  // ── viewmodel ────────────────────────────────────────────────────────────
  buildViewModelFor(slot) {
    const f = this.player;
    if (this.vm) {
      this.vmRoot.remove(this.vm.group);
      this.vm.group.traverse((o) => {
        if (o.isMesh && o.geometry) o.geometry.dispose?.();
      });
    }
    const def = f.weapons[slot].def;
    const skin = this.skin && this.skin.id !== "stock" ? this.skin : null;
    this.vm = buildViewModel(def, skin);
    this.vmRoot.add(this.vm.group);
    this.vmSlot = slot;
  }
  updateViewmodel(dt) {
    if (!this.vm) return;
    const f = this.player;
    const w = f.weapon;
    const g = this.vm.group;
    const st = this.vmState;
    const spd = f.mv.horizontalSpeed;
    const ads = w.ads;
    const hip = new THREE8.Vector3(0.155, -0.145, -0.3);
    const adsPos = new THREE8.Vector3(0, -0.075 - (this.vm.adsOffset ?? 0), -0.24);
    const sprint = f.mv.sprinting && !f.mv.sliding && spd > 7 ? 1 : 0;
    st.sprintBlend = lerp2(st.sprintBlend ?? 0, sprint, 1 - Math.exp(-10 * dt));
    st.slideBlend = lerp2(st.slideBlend ?? 0, f.mv.sliding ? 1 : 0, 1 - Math.exp(-12 * dt));
    const target = hip.clone().lerp(adsPos, ads);
    target.x += st.sprintBlend * 0.05;
    target.y -= st.sprintBlend * 0.03 + st.slideBlend * 0.05;
    target.z += st.sprintBlend * 0.02;
    st.sway.x = lerp2(st.sway.x, clamp4(-this.input.mouse.dx * 16e-4, -0.05, 0.05), 1 - Math.exp(-14 * dt));
    st.sway.y = lerp2(st.sway.y, clamp4(-this.input.mouse.dy * 16e-4, -0.05, 0.05), 1 - Math.exp(-14 * dt));
    const bobT = this.time * (6 + spd * 0.6);
    const bobAmt = f.mv.grounded && !f.mv.sliding ? clamp4(spd / 12, 0, 1.1) * 0.012 * (1 - ads * 0.8) : 0;
    target.x += st.sway.x + Math.cos(bobT * 0.5) * bobAmt;
    target.y += st.sway.y + Math.abs(Math.sin(bobT)) * bobAmt * 1.4;
    target.y += this.rig.dip * 0.35;
    st.kickVel.multiplyScalar(Math.exp(-16 * dt));
    st.kick.addScaledVector(st.kickVel, dt);
    st.kick.multiplyScalar(Math.exp(-11 * dt));
    if (st.swing > 0) st.swing = Math.max(0, st.swing - dt * 4.5);
    const swing = st.swing > 0 ? Math.sin((1 - st.swing) * Math.PI) : 0;
    const reloading = w.reloading;
    st.reload = lerp2(st.reload, reloading ? 1 : 0, 1 - Math.exp(-11 * dt));
    g.position.set(
      target.x + st.kick.x * 0.1,
      target.y + st.kick.y * 0.1 - st.reload * 0.12 - swing * 0.04,
      target.z + st.kick.z * 0.06
    );
    const rotX = st.kick.x * 1.6 - st.reload * 0.5 + st.sprintBlend * 0.12 - swing * 0.5;
    const rotY = st.sway.x * 6 + st.reload * 0.4 - st.sprintBlend * 0.25 + swing * st.swingDir * 0.9;
    const rotZ = st.sway.y * 5 + st.reload * 0.5 + st.sprintBlend * 0.22 + st.slideBlend * 0.1 + swing * st.swingDir * 0.4;
    g.rotation.set(rotX, rotY, rotZ);
    if (this.skin?.reactive) {
      const k = clamp4((spd - 5) / 12, 0, 1);
      for (const m of this.vm.materials) {
        if (m.emissive) m.emissiveIntensity = 0.35 + k * 1.5;
      }
    }
    this.vmCamera.fov = lerp2(58, 46, ads);
    this.vmCamera.updateProjectionMatrix();
  }
  // ── render ───────────────────────────────────────────────────────────────
  renderFrame(dt) {
    const f = this.player;
    const spec = f.alive ? null : this.spectateTarget();
    const cam = spec || f;
    this.rig.update(dt, {
      yaw: cam.mv.yaw,
      pitch: cam.mv.pitch,
      pos: cam.mv.pos,
      vel: cam.mv.vel,
      horizontalSpeed: cam.mv.horizontalSpeed,
      grounded: cam.mv.grounded,
      sliding: cam.mv.sliding,
      crouching: cam.mv.crouching,
      sprinting: cam.mv.sprinting,
      landImpact: cam.mv.landImpact
    }, spec ? 0 : f.weapon.ads, spec ? 0 : f.weapon.def.stats.adsFov);
    for (let i = this.banners.length - 1; i >= 0; i--) if ((this.banners[i].t -= dt) <= 0) this.banners.splice(i, 1);
    if (this.net) this.interpolateRemote();
    this.updatePlates(dt);
    if (this.vmRoot) this.vmRoot.visible = f.alive && !spec;
    this.updateViewmodel(dt);
    this.hitmarker = Math.max(0, this.hitmarker - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.2);
    this.renderWorld();
    this.hudAcc += dt;
    if (this.hudAcc > 1 / 30) {
      this.hudAcc = 0;
      this.pushHud();
    }
    this.input.endFrame();
  }
  pushHud() {
    const f = this.player;
    const w = f.weapon;
    const spd = f.mv.horizontalSpeed;
    const chains = f.mv.tracker.progress();
    this.onHud({
      hp: Math.max(0, Math.round(f.health)),
      maxHp: f.maxHealth,
      alive: f.alive,
      weapon: w.def.name,
      weaponId: w.id,
      slot: f.slot,
      ammo: w.isMelee || w.isUtility ? "\u221E" : w.ammo,
      reserve: w.isMelee || w.isUtility ? "" : w.reserve,
      reloading: w.reloading,
      ads: w.ads,
      reloadProgress: w.reloading ? 1 - w.reloadTimer / w.def.stats.reload : 0,
      speed: spd,
      vert: f.mv.vel.y,
      grounded: f.mv.grounded,
      sliding: f.mv.sliding,
      sprinting: f.mv.sprinting,
      crouching: f.mv.crouching,
      slope: f.mv.groundNormal.y,
      momentum: momentumScale(spd, f.slot === "melee" ? "melee" : "gun"),
      topSpeed: f.mv.topSpeed,
      chains,
      utility: { name: f.utility.def.name, uses: f.utility.uses, id: f.utility.id },
      spread: w.currentSpread ? w.currentSpread({ speed: spd, grounded: f.mv.grounded, sliding: f.mv.sliding, crouching: f.mv.crouching }) : 0,
      hitmarker: this.hitmarker,
      headshot: this.lastHitWasHead,
      damageFlash: this.damageFlash,
      flashTime: f.flashTime,
      haste: f.haste > 0,
      slow: f.slow > 0,
      round: { phase: this.match.phase, timer: this.match.timer, round: this.match.round, scoreA: this.match.scoreA, scoreB: this.match.scoreB, roundTime: this.match.roundTime },
      stats: f.stats,
      fps: this.fps,
      mode: this.mode.id,
      mapName: this.map.name,
      enemies: this.fighters.filter((x) => x.alive && x.team !== f.team).length,
      allies: this.fighters.filter((x) => x.alive && x.team === f.team).length - 1,
      killfeed: this.killfeed.slice(),
      respawnTimer: f.alive ? 0 : Math.max(0, f.respawnTimer),
      hitDirs: this.hitDirs.map((h) => ({ id: h.id, ang: h.ang, t: h.t })),
      banners: this.banners.map((b) => ({ id: b.id, text: b.text, kind: b.kind, t: b.t })),
      spectating: this.mode.id === "range" ? null : f.alive ? null : this.spectateTarget()?.name ?? null,
      spawnGuard: Math.max(0, f.spawnGuard),
      streak: this.killStreak,
      matchPoint: this.match.scoreA >= FIRST_TO - 1 || this.match.scoreB >= FIRST_TO - 1,
      ping: this.net ? this.netPing : 0,
      net: this.net ? { role: this.netRole, state: this.net.state, ping: this.netPing, peer: this.netState?.remoteHello?.name || null } : null,
      scoreboard: this.scoreboard,
      board: this.scoreboard ? this.fighters.map((x) => ({
        name: x.name,
        team: x.team,
        you: x === f,
        dummy: !!x.isDummy,
        kills: x.stats.kills,
        deaths: x.stats.deaths,
        damage: Math.round(x.stats.damage),
        alive: x.alive,
        ping: x.ping ?? 0
      })) : null,
      lastWin: this.lastRoundWin
    });
  }
};
function jitter(dir, spreadRad) {
  if (spreadRad <= 0) return dir.clone();
  const d = dir.clone();
  const up = Math.abs(d.y) > 0.95 ? new THREE8.Vector3(1, 0, 0) : new THREE8.Vector3(0, 1, 0);
  const right = new THREE8.Vector3().crossVectors(d, up).normalize();
  const realUp = new THREE8.Vector3().crossVectors(right, d).normalize();
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * spreadRad;
  d.addScaledVector(right, Math.cos(a) * Math.tan(r));
  d.addScaledVector(realUp, Math.sin(a) * Math.tan(r));
  return d.normalize();
}
function PhysicsRayCapsule(ro, rd, a, b, r) {
  const ba = new THREE8.Vector3().subVectors(b, a);
  const oa = new THREE8.Vector3().subVectors(ro, a);
  const baba = ba.dot(ba);
  const bard = ba.dot(rd);
  const baoa = ba.dot(oa);
  const rdoa = rd.dot(oa);
  const oaoa = oa.dot(oa);
  const A = baba - bard * bard;
  const B2 = baba * rdoa - baoa * bard;
  const C = baba * oaoa - baoa * baoa - r * r * baba;
  const h = B2 * B2 - A * C;
  if (h >= 0 && Math.abs(A) > 1e-9) {
    const t = (-B2 - Math.sqrt(h)) / A;
    const y = baoa + t * bard;
    if (y > 0 && y < baba) return t >= 0 ? t : null;
    const oc = y <= 0 ? oa : new THREE8.Vector3().subVectors(ro, b);
    const B22 = rd.dot(oc);
    const C2 = oc.dot(oc) - r * r;
    const h2 = B22 * B22 - C2;
    if (h2 > 0) {
      const t2 = -B22 - Math.sqrt(h2);
      return t2 >= 0 ? t2 : null;
    }
    return null;
  }
  return null;
}
var ALL_PRIMARIES = ["vex9", "krill", "halberd", "tremor", "longspur", "blackwing", "shatter", "wraith", "prismc", "quasar"];
var ALL_SECONDARIES = ["q1", "vesper", "moskito", "hornet", "cutlass", "needle", "judge", "flare", "prismp", "twinfang"];
var ALL_MELEE = ["knife", "fists", "bat", "machete", "tonfa", "katana", "axe", "spear", "sledge", "qynblade"];
var ALL_UTILITY = ["frag", "flash", "smoke", "emp", "stim", "dash", "grapnel", "barrier", "mine", "decoy"];
var pick = (a) => a[Math.floor(Math.random() * a.length)];
function randomLoadout() {
  return { primary: pick(ALL_PRIMARIES), secondary: pick(ALL_SECONDARIES), melee: pick(ALL_MELEE), utility: pick(ALL_UTILITY) };
}
function randomSkin() {
  const ids = ["stock", "midnight", "arctic", "ember", "neon", "hazard", "vapor", "jade", "carbon"];
  return SKIN_MAP[pick(ids)];
}

// src/App.jsx
function App() {
  const [profile, setProfile] = useState6(() => loadProfile());
  const [screen, setScreen] = useState6("title");
  const [queue, setQueue] = useState6(null);
  const [matchCfg, setMatchCfg] = useState6(null);
  const [hud, setHud] = useState6(null);
  const [paused, setPaused] = useState6(false);
  const [needsLock, setNeedsLock] = useState6(true);
  const [result, setResult] = useState6(null);
  const [toastMsg, setToast] = useState6(null);
  const [rangePicker, setRangePicker] = useState6(false);
  const [netInfo, setNetInfo] = useState6(null);
  const [damageNums, setDamageNums] = useState6([]);
  const canvasRef = useRef2(null);
  const gameRef = useRef2(null);
  const save = useCallback((p) => {
    setProfile(p);
    saveProfile(p);
  }, []);
  const toast = useCallback((msg, bad) => {
    setToast({ msg, bad });
    setTimeout(() => setToast(null), 2e3);
  }, []);
  useEffect3(() => {
    if (screen !== "playing" || !canvasRef.current || !matchCfg) return;
    const g = new Game(canvasRef.current, {
      rendererFactory: window.__qyngunRendererFactory,
      // headless test hook
      settings: profile.settings,
      onHud: setHud,
      onEvent: (type, data) => {
        if (type === "matchend") finishMatch(g, data);
        else if (type === "damage") {
          const id = Math.random().toString(36).slice(2);
          setDamageNums((d) => [...d.slice(-6), { id, ...data }]);
          setTimeout(() => setDamageNums((d) => d.filter((x) => x.id !== id)), 900);
        } else if (type === "peerleft") {
          toast("The other player left the duel.", true);
        } else if (type === "roundend") {
          g.lastRoundWin = data.winner === "a" ? "ROUND WON" : data.winner === "b" ? "ROUND LOST" : "DRAW";
        }
      }
    });
    g.load({
      mapId: matchCfg.mapId,
      modeId: matchCfg.modeId,
      loadout: matchCfg.loadout || profile.loadout,
      skin: profile.skin,
      botLevel: matchCfg.bots || profile.settings.botLevel,
      net: matchCfg.net || null,
      netRole: matchCfg.netRole || null,
      peerName: matchCfg.peerName,
      playerName: matchCfg.name
    });
    g.audio.resume();
    g.start();
    g.setPaused(true);
    setPaused(true);
    setNeedsLock(true);
    gameRef.current = g;
    window.__qyn = g;
    g.input.onLockChange((engaged) => {
      setPaused(!engaged);
      g.setPaused(!engaged);
      if (engaged) setNeedsLock(false);
    });
    g.input.requestLock(true, false);
    return () => {
      g.dispose();
      gameRef.current = null;
      setHud(null);
    };
  }, [screen, matchCfg]);
  useEffect3(() => {
    const g = gameRef.current;
    if (!g) return;
    g.settings = profile.settings;
    g.input.sensitivity = profile.settings.sensitivity;
    g.rig.baseFov = profile.settings.fov;
    g.audio.setVolume(profile.settings.volume);
    g.audio.enabled = profile.settings.sound !== false;
  }, [profile.settings]);
  const finishMatch = (g, data) => {
    const p = structuredClone(profile);
    const st = data.stats || {};
    const reward = rewardMatch(p, {
      won: data.winner === "a",
      scoreA: data.scoreA,
      scoreB: data.scoreB,
      kills: st.kills || 0,
      deaths: st.deaths || 0,
      damage: st.damage || 0,
      headshots: st.headshots || 0,
      chains: Object.keys(st.chains || {}).length,
      topSpeed: g.player?.mv?.topSpeed || st.topSpeed || 0
    });
    const chains = g.player?.mv?.tracker?.done || {};
    p.stats.chains = { ...p.stats.chains || {}, ...chains };
    save(p);
    setResult({ ...data, ...reward });
    g.setPaused(true);
    g.input.exitLock();
    setScreen("result");
  };
  const startMatch = (loadout) => {
    setMatchCfg({ ...queue, loadout, key: Math.random() });
    setScreen("playing");
  };
  const quitMatch = () => {
    const net = matchCfg?.net;
    if (net) {
      net.send(["x"]);
      net.close();
    }
    setNetInfo(null);
    setMatchCfg(null);
    setScreen("lobby");
  };
  const applyRangeLoadout = (l) => {
    const g = gameRef.current;
    const p = { ...profile, loadout: l };
    save(p);
    if (g) g.applyLoadout(l);
    setRangePicker(false);
    g?.input.requestLock();
  };
  useEffect3(() => {
    const onKey = (e) => {
      if (screen !== "playing" || !gameRef.current) return;
      if (e.code === "KeyB" && gameRef.current.mode?.id === "range") {
        setRangePicker((v) => !v);
        if (!rangePicker) gameRef.current.input.exitLock();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, rangePicker]);
  const isRange = matchCfg?.modeId === "range";
  return /* @__PURE__ */ React10.createElement("div", { className: "app" }, screen === "title" && /* @__PURE__ */ React10.createElement(
    Title,
    {
      profile,
      onPlay: () => setScreen("lobby"),
      onArmory: () => setScreen("armory"),
      onSkins: () => setScreen("skins"),
      onSettings: () => setScreen("settings")
    }
  ), screen === "lobby" && /* @__PURE__ */ React10.createElement(
    Lobby,
    {
      profile,
      onQueue: (q) => {
        setQueue(q);
        setScreen("loadout");
      },
      onOnline: () => setScreen("netplay"),
      onBack: () => setScreen("title")
    }
  ), screen === "netplay" && /* @__PURE__ */ React10.createElement(
    Netplay,
    {
      profile,
      onConnected: (net, cfg) => {
        setNetInfo({ net, ...cfg });
        setQueue({ modeId: "p2p", mapId: cfg.mapId, net, netRole: cfg.role, peerName: cfg.name });
        setScreen("loadout");
      },
      onBack: () => setScreen("lobby")
    }
  ), screen === "loadout" && queue && /* @__PURE__ */ React10.createElement(
    Loadout,
    {
      profile,
      save,
      peerName: queue.peerName,
      mapId: queue.mapId,
      mode: MODES.find((m) => m.id === queue.modeId),
      onStart: startMatch,
      onBack: () => setScreen("lobby")
    }
  ), screen === "armory" && /* @__PURE__ */ React10.createElement(Armory, { profile, save, toast, onBack: () => setScreen("title") }), screen === "skins" && /* @__PURE__ */ React10.createElement(Skins, { profile, save, toast, onBack: () => setScreen("title") }), screen === "settings" && /* @__PURE__ */ React10.createElement(Settings, { profile, save, onBack: () => setScreen("title") }), screen === "result" && result && /* @__PURE__ */ React10.createElement(
    Result,
    {
      data: result,
      profile,
      onAgain: () => {
        setResult(null);
        setScreen("loadout");
      },
      onLobby: () => {
        setResult(null);
        setScreen("lobby");
      }
    }
  ), screen === "playing" && /* @__PURE__ */ React10.createElement("div", { className: "gwrap" }, /* @__PURE__ */ React10.createElement(
    "canvas",
    {
      ref: canvasRef,
      className: paused ? "" : "live",
      onClick: () => gameRef.current?.input.requestLock()
    }
  ), hud && /* @__PURE__ */ React10.createElement(
    HUD,
    {
      hud,
      paused,
      needsLock,
      showMv: profile.settings.showMovement,
      mapName: hud.mapName,
      mode: matchCfg?.modeId,
      onResume: () => gameRef.current?.input.requestLock(),
      onQuit: quitMatch
    }
  ), /* @__PURE__ */ React10.createElement("div", { style: { position: "absolute", left: "50%", top: "58%", transform: "translateX(-50%)", pointerEvents: "none" } }, damageNums.map((d) => /* @__PURE__ */ React10.createElement("div", { key: d.id, style: {
    fontFamily: "var(--mono)",
    fontSize: d.head ? 22 : 16,
    fontWeight: 800,
    color: d.head ? "var(--gd)" : "#fff",
    textShadow: "0 2px 6px #000",
    animation: "fadeUp .9s ease-out forwards"
  } }, Math.round(d.amount), d.head ? " \u2316" : ""))), isRange && !rangePicker && /* @__PURE__ */ React10.createElement("div", { className: "panel", style: { position: "absolute", left: "50%", bottom: 24, transform: "translateX(-50%)", fontSize: 11, letterSpacing: ".12em", pointerEvents: "none" } }, "RANGE \u2014 ", /* @__PURE__ */ React10.createElement("b", { style: { color: "var(--cy)" } }, "[B]"), " CHANGE LOADOUT \xB7 EVERY WEAPON UNLOCKED \xB7 DUMMIES RESPAWN"), !hud && /* @__PURE__ */ React10.createElement("div", { style: { position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--dim)", letterSpacing: ".3em", fontSize: 12 } }, "LOADING ARENA\u2026")), rangePicker && /* @__PURE__ */ React10.createElement("div", { style: { position: "absolute", inset: 0, zIndex: 40 } }, /* @__PURE__ */ React10.createElement(
    Loadout,
    {
      profile: { ...profile, unlocked: ["vex9", "krill", "halberd", "tremor", "longspur", "blackwing", "shatter", "wraith", "prismc", "quasar", "q1", "vesper", "moskito", "hornet", "cutlass", "needle", "judge", "flare", "prismp", "twinfang", "knife", "fists", "bat", "machete", "tonfa", "katana", "axe", "spear", "sledge", "qynblade", "frag", "flash", "smoke", "emp", "stim", "dash", "grapnel", "barrier", "mine", "decoy"] },
      save,
      mapId: "range",
      mode: MODES.find((m) => m.id === "range"),
      onStart: applyRangeLoadout,
      onBack: () => {
        setRangePicker(false);
        gameRef.current?.input.requestLock();
      }
    }
  )), toastMsg && /* @__PURE__ */ React10.createElement("div", { className: `toast ${toastMsg.bad ? "bad" : ""}` }, toastMsg.msg));
}
export {
  App,
  Armory,
  HUD,
  Loadout,
  Lobby,
  Netplay,
  Result,
  Settings,
  Skins,
  Title
};
