// Writes this repository's copies of the release workflow and its two programs
// from a checkout of Fronthub-pl/arrowz. Only the text SWAPS names is changed;
// everything else is the source, byte for byte.
//
//   deno run --allow-read --allow-write derive.ts <path to an arrowz checkout>

export interface Swap {
  file: string
  /** A piece of the source that is there exactly `times` times. */
  find: string
  put: string
  times: number
}

const WORKFLOW = '.github/workflows/release.yml'
const RELEASE = 'packages/engine/scripts/release.ts'
const PACK_CHECK = 'packages/engine/scripts/pack-check.ts'

/** The files derive writes, at the paths they have in arrowz. */
export const FILES = [WORKFLOW, RELEASE, PACK_CHECK]

const CLI_RULE = `    bin: { arrowz: './dist/arrowz.mjs' },
    typed: false,
  },
`

const REHEARSAL_RULE = `  '@fronthub/arrowz-rehearsal': {
    files: [DOCS, /^index\\.js$/],
    required: ALWAYS,
    budget: 10_000,
    exports: ['.'],
    bin: {},
    typed: false,
  },
`

const CHECKS = `      - run: pnpm --filter @fronthub/arrowz-board exec playwright install --with-deps chromium

      - run: pnpm nx run-many -t check lint fmt test build smoke pack-check

`

const LEGS = `          - { os: ubuntu-latest, node: 22 }
          - { os: ubuntu-latest, node: 24 }
          - { os: ubuntu-24.04-arm, node: 22 }
          - { os: ubuntu-24.04-arm, node: 24 }
          - { os: macos-latest, node: 22 }
          - { os: macos-latest, node: 24 }
          - { os: macos-15-intel, node: 22 }
          - { os: macos-15-intel, node: 24 }
          - { os: windows-latest, node: 22 }
          - { os: windows-latest, node: 24 }
          - { os: windows-11-arm, node: 22 }
          - { os: windows-11-arm, node: 24 }
          # The oldest Node the packages promise to run on.
          - { os: ubuntu-latest, node: 22.12.0 }
          # npm 12 runs no install script and takes no git or URL dependency; no Node bundles it yet.
          - { os: ubuntu-latest, node: 24, npm: 12 }
          - { os: ubuntu-latest, node: 24, deno: true }
          - { os: windows-latest, node: 24, deno: true }
`

const CONSUMER =
  "      - run: ${{ matrix.deno && 'deno run --no-config --no-lock --allow-all' || 'node' }} packages/engine/scripts/consumer-smoke.mjs tarballs\n"

const IMPORT =
  `      # The one package has no consumer program: an install in an empty project and an import are the smoke.
      - run: |
          mkdir "$RUNNER_TEMP/consumer"
          cd "$RUNNER_TEMP/consumer"
          npm init --yes > /dev/null
          npm install --ignore-scripts "$GITHUB_WORKSPACE"/tarballs/*.tgz
          node --input-type=module --eval "import { rehearsal } from '@fronthub/arrowz-rehearsal'; if (rehearsal !== true) process.exit(1)"
`

const BARE_PATH = '                if ! npm stage publish --ignore-scripts "$tgz"; then\n'

const DOT_PATH =
  '                # npm takes `tarballs/x.tgz` for a GitHub repository; a path that starts with ./ is a file.\n' +
  '                if ! npm stage publish --ignore-scripts "./$tgz"; then\n'

export const SWAPS: Swap[] = [
  {
    file: RELEASE,
    find: "const DIRS = ['packages/engine', 'packages/board-element', 'packages/cli']",
    put: "const DIRS = ['packages/rehearsal']",
    times: 1,
  },
  { file: PACK_CHECK, find: `${CLI_RULE}}\n`, put: `${CLI_RULE}${REHEARSAL_RULE}}\n`, times: 1 },
  { file: WORKFLOW, find: 'fronthub-arrowz-(engine|board|cli)-', put: 'fronthub-arrowz-(rehearsal)-', times: 2 },
  { file: WORKFLOW, find: 'for name in engine board cli; do', put: 'for name in rehearsal; do', times: 1 },
  { file: WORKFLOW, find: CHECKS, put: '', times: 1 },
  { file: WORKFLOW, find: LEGS, put: '          - { os: ubuntu-latest, node: 24 }\n', times: 1 },
  { file: WORKFLOW, find: CONSUMER, put: IMPORT, times: 1 },
  // Found by the first run here; the swap goes when Arrowz carries the same two lines.
  { file: WORKFLOW, find: BARE_PATH, put: DOT_PATH, times: 1 },
]

/** Puts `put` wherever `find` is; throws unless `find` is there exactly `times` times. */
export function swap(text: string, { file, find, put, times }: Swap): string {
  const parts = text.split(find)
  if (parts.length - 1 !== times) {
    throw new Error(`${file}: ${JSON.stringify(find.slice(0, 60))} is there ${parts.length - 1} times, not ${times}`)
  }
  return parts.join(put)
}

/** The derived text of one file. */
export function derive(file: string, source: string): string {
  return SWAPS.filter((s) => s.file === file).reduce(swap, source)
}

if (import.meta.main) {
  const [arrowz] = Deno.args
  if (!arrowz || Deno.args.length !== 1) {
    console.error('usage: derive.ts <path to an arrowz checkout>')
    Deno.exit(2)
  }
  const here = new URL('.', import.meta.url).pathname
  try {
    for (const file of FILES) {
      const text = derive(file, Deno.readTextFileSync(`${arrowz}/${file}`))
      Deno.mkdirSync(`${here}${file}`.replace(/\/[^/]+$/, ''), { recursive: true })
      Deno.writeTextFileSync(`${here}${file}`, text)
      console.log(`wrote ${file}`)
    }
  } catch (error) {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`)
    Deno.exit(1)
  }
}
