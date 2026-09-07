// ────────────────────────────────────────────────────────────────────────────
//  Weapon skins — palettes the viewmodel builder uses, plus a HUD accent.
// ────────────────────────────────────────────────────────────────────────────
export const SKINS = [
  { id: 'stock', name: 'FACTORY', qyn: 0, desc: 'Standard issue.', body: null, accent: null, glow: null, trim: '#9fb3c8' },
  { id: 'midnight', name: 'MIDNIGHT', qyn: 450, desc: 'Matte black with a cold blue sheen.', body: 0x14161c, accent: 0x3d5a80, glow: 0x24425e, trim: '#5b8ec7' },
  { id: 'arctic', name: 'ARCTIC DRIFT', qyn: 700, desc: 'Frost white plate, cyan piping.', body: 0xdfe9f3, accent: 0x6ee7ff, glow: 0x9beaff, trim: '#bfefff' },
  { id: 'ember', name: 'EMBER', qyn: 900, desc: 'Burnt orange over scorched steel.', body: 0x2a1a12, accent: 0xff7a2f, glow: 0xff9d4d, trim: '#ff9d4d' },
  { id: 'neon', name: 'NEON DRIFT', qyn: 1400, desc: 'Hot pink and electric cyan. Loud on purpose.', body: 0x1b0f22, accent: 0xff3df0, glow: 0xff7ae0, trim: '#ff7ae0' },
  { id: 'hazard', name: 'HAZARD', qyn: 1200, desc: 'Industrial yellow with black chevrons.', body: 0x2b2b22, accent: 0xffe14d, glow: 0xfff08a, trim: '#ffe14d' },
  { id: 'vapor', name: 'VAPORWAVE', qyn: 1800, desc: 'Sunset gradient, chrome highlights.', body: 0x2b1b46, accent: 0xff6ec7, glow: 0x8affff, trim: '#8affff' },
  { id: 'jade', name: 'JADE PROTOCOL', qyn: 1600, desc: 'Deep jade with gold inlay.', body: 0x0f2b26, accent: 0x3ddc97, glow: 0x9dffd0, trim: '#3ddc97' },
  { id: 'carbon', name: 'CARBON WEAVE', qyn: 2000, desc: 'Woven carbon, crimson thread.', body: 0x111214, accent: 0xff4d6d, glow: 0x7a2233, trim: '#ff4d6d' },
  { id: 'solar', name: 'SOLAR FLARE', qyn: 2600, desc: 'White hot. Glows brighter the faster you move.', body: 0x3a2606, accent: 0xffb703, glow: 0xffe08a, trim: '#ffb703', reactive: true },
  { id: 'void', name: 'VOIDLINE', qyn: 3200, desc: 'Absorbs light. Edges hum violet.', body: 0x0a0a0f, accent: 0x7c3aed, glow: 0xb388ff, trim: '#b388ff', reactive: true },
  { id: 'gilded', name: 'GILDED STANDARD', qyn: 5000, desc: 'Solid gold. For players who have already won.', body: 0x4a3708, accent: 0xffd700, glow: 0xfff3a0, trim: '#ffd700', reactive: true },
]

export const SKIN_MAP = Object.fromEntries(SKINS.map((s) => [s.id, s]))
