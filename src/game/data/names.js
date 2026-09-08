// Bot / lobby identities. Everyone in the lobby reads like a real player:
// a name, a ping and a loadout — the bots just happen to be the ones moving.
export const BOT_NAMES = [
  'VEXA', 'K0RR', 'NILL', 'ZEPH', 'ORYX', 'SABLE', 'MOTH', 'QUEN',
  'DRIFT', 'HALO', 'RUIN', 'ONYX', 'PYRE', 'AXIS', 'NOVA', 'GLOOM',
]

export const BOT_TAGS = ['', '²', '³', '.exe', '_', '-7', '//']

export function rollName (pool = BOT_NAMES) {
  const n = pool[Math.floor(Math.random() * pool.length)]
  const t = BOT_TAGS[Math.floor(Math.random() * BOT_TAGS.length)]
  return n + t
}

export function rollPing () {
  return 12 + Math.floor(Math.random() * 68)
}
