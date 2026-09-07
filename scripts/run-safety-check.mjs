// Runner for scripts/safety-check.ts — bundles with esbuild (a vite
// dependency, present after `npm install`) and executes it in Node.
// Usage: npm run test:safety   (exit code 0 = every sandbox guarantee held)

import { build } from 'esbuild'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { rmSync } from 'node:fs'

const entry = new URL('./safety-check.ts', import.meta.url).pathname
const out = join(tmpdir(), `creator-safety-${Date.now()}.mjs`)

let exitCode = 0
try {
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: out,
    external: ['three'],
    logLevel: 'silent',
  })
  // safety-check.ts asserts at module top level and exports { result }
  const mod = await import(pathToFileURL(out).href)
  if (mod.result && mod.result.fail > 0) exitCode = 1
} catch (err) {
  console.error('safety-check runner failed:', err)
  exitCode = 1
} finally {
  try {
    rmSync(out, { force: true })
  } catch {
    // best-effort cleanup
  }
}
process.exitCode = exitCode
