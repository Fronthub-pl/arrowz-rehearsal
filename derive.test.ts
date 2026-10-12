import { assertEquals, assertThrows } from '@std/assert'
import { parse } from '@std/yaml'
import { derive, FILES, swap, SWAPS } from './derive.ts'

const once = { file: 'a.txt', find: 'engine', put: 'rehearsal', times: 1 }

Deno.test('swap puts the new text where the old one was', () => {
  assertEquals(swap('pack engine now', once), 'pack rehearsal now')
})

Deno.test('swap replaces every occurrence when it is told how many there are', () => {
  assertEquals(swap('engine, engine', { ...once, times: 2 }), 'rehearsal, rehearsal')
})

Deno.test('swap keeps a dollar sign of the new text as it is', () => {
  assertEquals(swap('run engine', { ...once, put: '"$RUNNER_TEMP" $& $1' }), 'run "$RUNNER_TEMP" $& $1')
})

Deno.test('swap refuses a source that no longer has the text', () => {
  assertThrows(() => swap('pack board now', once), Error, 'a.txt: "engine" is there 0 times, not 1')
})

Deno.test('swap refuses a source that has the text more often than stated', () => {
  assertThrows(() => swap('engine, engine', once), Error, 'a.txt: "engine" is there 2 times, not 1')
})

Deno.test('derive changes a file only through the swaps that name it', () => {
  assertEquals(derive('not/a/derived/file', 'for name in engine board cli; do'), 'for name in engine board cli; do')
})

Deno.test('every swap names a file derive writes', () => {
  for (const s of SWAPS) assertEquals(FILES.includes(s.file), true, s.file)
})

interface Job {
  if?: string
  environment?: string
  permissions?: Record<string, string>
  strategy?: { matrix?: { include?: unknown[] } }
}

// The committed copy, not a fixture: it is the file GitHub runs.
const workflow = parse(Deno.readTextFileSync(new URL('.github/workflows/release.yml', import.meta.url))) as {
  jobs: Record<string, Job>
}

Deno.test('the derived workflow has the five jobs of the source', () => {
  assertEquals(Object.keys(workflow.jobs), ['tag-published', 'plan', 'build', 'smoke', 'stage'])
})

Deno.test('the derived workflow gives the npm identity to the stage job only, and only on main', () => {
  const trusted = Object.entries(workflow.jobs).filter(([, job]) => job.permissions?.['id-token'] !== undefined)
  assertEquals(trusted.map(([name]) => name), ['stage'])
  assertEquals(workflow.jobs.stage?.environment, 'npm')
  assertEquals(workflow.jobs.stage?.if, "github.event_name != 'pull_request' && github.ref == 'refs/heads/main'")
})

Deno.test('the derived smoke has one leg', () => {
  assertEquals(workflow.jobs.smoke?.strategy?.matrix?.include?.length, 1)
})
