# arrowz-rehearsal

A rehearsal of the release workflow of [Arrowz](https://github.com/Fronthub-pl/arrowz)
on a throwaway package, `@fronthub/arrowz-rehearsal`. Nothing here is for use.

Arrowz publishes its packages by staging them on npm from GitHub Actions, and a
maintainer approves each staged version with a second factor. Before the first
real release, this repository ran that flow once for real, to see what npm does
where its documentation left a question open. The answers are in
[Results](#results).

## How this repository relates to Arrowz

`derive.ts` wrote three files from Arrowz at commit `8466f99`, at the paths
they have there:

- `.github/workflows/release.yml`
- `packages/engine/scripts/release.ts`
- `packages/engine/scripts/pack-check.ts`

```sh
deno run --allow-read --allow-write derive.ts <path to an arrowz checkout>
```

It changes only the text its `SWAPS` list names, and stops when a piece of that
text is not in the source exactly as often as the list says. So the jobs
`tag-published` and `plan` are the ones Arrowz runs; `stage` differs in two
names and in the fix of a fault the first run here found (see
[Faults found](#faults-found)); `build` packs and judges the one package but
runs no other check; and `smoke` has one leg. The whole difference:

```diff
--- arrowz/.github/workflows/release.yml
+++ arrowz-rehearsal/.github/workflows/release.yml
@@ -88,10 +88,6 @@
 
       - run: pnpm install --frozen-lockfile
 
-      - run: pnpm --filter @fronthub/arrowz-board exec playwright install --with-deps chromium
-
-      - run: pnpm nx run-many -t check lint fmt test build smoke pack-check
-
       # Packed again, into the directory the stage job receives: the gates run on those very files.
       - run: deno run --allow-read --allow-write --allow-run --allow-env packages/engine/scripts/pack-check.ts --out=tarballs $DIRS
         env:
@@ -113,7 +109,7 @@
         env:
           SUMS: ${{ steps.sums.outputs.sums }}
         run: |
-          if printf '%s\n' "$SUMS" | grep -Evq '^[0-9a-f]{64}  tarballs/fronthub-arrowz-(engine|board|cli)-[0-9A-Za-z.+-]+\.tgz$'; then
+          if printf '%s\n' "$SUMS" | grep -Evq '^[0-9a-f]{64}  tarballs/fronthub-arrowz-(rehearsal)-[0-9A-Za-z.+-]+\.tgz$'; then
             echo "::error::the digest list names something that is not one of the three tarballs"
             exit 1
           fi
@@ -143,24 +139,7 @@
       fail-fast: false
       matrix:
         include:
-          - { os: ubuntu-latest, node: 22 }
           - { os: ubuntu-latest, node: 24 }
-          - { os: ubuntu-24.04-arm, node: 22 }
-          - { os: ubuntu-24.04-arm, node: 24 }
-          - { os: macos-latest, node: 22 }
-          - { os: macos-latest, node: 24 }
-          - { os: macos-15-intel, node: 22 }
-          - { os: macos-15-intel, node: 24 }
-          - { os: windows-latest, node: 22 }
-          - { os: windows-latest, node: 24 }
-          - { os: windows-11-arm, node: 22 }
-          - { os: windows-11-arm, node: 24 }
-          # The oldest Node the packages promise to run on.
-          - { os: ubuntu-latest, node: 22.12.0 }
-          # npm 12 runs no install script and takes no git or URL dependency; no Node bundles it yet.
-          - { os: ubuntu-latest, node: 24, npm: 12 }
-          - { os: ubuntu-latest, node: 24, deno: true }
-          - { os: windows-latest, node: 24, deno: true }
     runs-on: ${{ matrix.os }}
     permissions:
       contents: read
@@ -187,7 +166,13 @@
           name: tarballs
           path: tarballs
 
-      - run: ${{ matrix.deno && 'deno run --no-config --no-lock --allow-all' || 'node' }} packages/engine/scripts/consumer-smoke.mjs tarballs
+      # The one package has no consumer program: an install in an empty project and an import are the smoke.
+      - run: |
+          mkdir "$RUNNER_TEMP/consumer"
+          cd "$RUNNER_TEMP/consumer"
+          npm init --yes > /dev/null
+          npm install --ignore-scripts "$GITHUB_WORKSPACE"/tarballs/*.tgz
+          node --input-type=module --eval "import { rehearsal } from '@fronthub/arrowz-rehearsal'; if (rehearsal !== true) process.exit(1)"
 
   # The only job npm trusts. It runs no code from the repository: it receives
   # the tarballs the gates passed and hands them to npm, which holds them until
@@ -246,7 +231,7 @@
             echo "::error::the build job handed over no digests"
             exit 1
           fi
-          if printf '%s\n' "$SUMS" | grep -Evq '^[0-9a-f]{64}  tarballs/fronthub-arrowz-(engine|board|cli)-[0-9A-Za-z.+-]+\.tgz$'; then
+          if printf '%s\n' "$SUMS" | grep -Evq '^[0-9a-f]{64}  tarballs/fronthub-arrowz-(rehearsal)-[0-9A-Za-z.+-]+\.tgz$'; then
             echo "::error::the digest list names something that is not one of the three tarballs"
             exit 1
           fi
@@ -264,11 +249,12 @@
           # re-run must still reach the packages npm has not staged yet.
           failed=0
           handed=0
-          for name in engine board cli; do
+          for name in rehearsal; do
             for tgz in tarballs/fronthub-arrowz-"$name"-*.tgz; do
               if [ -e "$tgz" ]; then
                 handed=$((handed + 1))
-                if ! npm stage publish --ignore-scripts "$tgz"; then
+                # npm takes `tarballs/x.tgz` for a GitHub repository; a path that starts with ./ is a file.
+                if ! npm stage publish --ignore-scripts "./$tgz"; then
                   echo "::error::npm did not stage $tgz"
                   failed=1
                 fi
--- arrowz/packages/engine/scripts/release.ts
+++ arrowz-rehearsal/packages/engine/scripts/release.ts
@@ -8,7 +8,7 @@
 // It imports nothing, so a job runs it straight after checkout, without an install.
 
 /** The published packages, dependencies first: the order they are staged and approved in. */
-const DIRS = ['packages/engine', 'packages/board-element', 'packages/cli']
+const DIRS = ['packages/rehearsal']
 
 /** The value a manifest carries until its first version PR; on npm it is only ever a placeholder. */
 const UNRELEASED = '0.0.0'
--- arrowz/packages/engine/scripts/pack-check.ts
+++ arrowz-rehearsal/packages/engine/scripts/pack-check.ts
@@ -59,6 +59,14 @@
     budget: 30_000,
     exports: [],
     bin: { arrowz: './dist/arrowz.mjs' },
+    typed: false,
+  },
+  '@fronthub/arrowz-rehearsal': {
+    files: [DOCS, /^index\.js$/],
+    required: ALWAYS,
+    budget: 10_000,
+    exports: ['.'],
+    bin: {},
     typed: false,
   },
 }
```

Everything else (`derive.ts`, its test, the manifests, `packages/rehearsal/`)
was written for the rehearsal.

## Faults found

Faults of the workflow itself, which no question asked about.

| # | Fault | Evidence | Fix |
|---|---|---|---|
| F1 | `stage` handed npm the tarball as `tarballs/fronthub-arrowz-rehearsal-0.1.0.tgz`. npm takes a path of that shape for a GitHub repository (`owner/repo`) and tried `git ls-remote ssh://git@github.com/tarballs/fronthub-arrowz-rehearsal-0.1.0.tgz.git`; nothing reached the registry. The digest check before it passed (`OK`), the first time `stage` downloaded an artifact. `npm publish` reads the path the same way. | [run 38232131979](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38232131979), job `stage`; locally `npm stage publish tarballs/x.tgz --dry-run` fails the same way and `./tarballs/x.tgz` is accepted (npm 11.16.0) | The path starts with `./`. Here it is a swap of `derive.ts` until Arrowz carries the same two lines. |

## Results

Each row is filled in when its step has run. "Evidence" is a link to the
workflow run or the output of the command.

| # | Question | What was seen | Evidence |
|---|---|---|---|
| Q1 | Does the OIDC exchange work with the `.npmrc` that `actions/setup-node` writes? | | |
| Q2 | What does `stage` print, and how does it end, when the package does not exist on npm? | | |
| Q3 | What does `stage` print when one field of the trusted publisher is wrong? | | |
| Q4 | Does `npm stage publish` from a logged-in laptop create a package that does not exist, and does the package stay after its only staged version is rejected? | | |
| Q5 | What does `npm view <name>@<version> version --json` answer for a version that is staged and not approved? | | |
| Q6 | The error and the exit status of `npm stage publish` for a version that is already staged | | |
| Q7 | Can a rejected version number be staged again? | | |
| Q8 | Does staging alone count as the first publish for the two-day rule of a trusted publisher? | | |
| Q9 | Does npm run a lifecycle script when it stages a tarball? | | |
| Q10 | Does a stage over OIDC carry provenance, and does the package page show it after approval? | | |
| Q11 | Is `latest` the approved `0.1.0`, whatever form the placeholder took? | | |
| Q12 | Is the release tag created under the tag ruleset, on the commit that set the version? | | |
| Q13 | Does "Re-run all jobs" pass with `overwrite: true` on the upload? | | |
| Q14 | What does the "Allowed actions" field of the trusted-publisher form ask for? | | |
| Q15 | Is `npm publish` from the workflow refused when the entry allows staging only? | | |
| Q16 | Is a run by hand at `0.0.0` green, planning nothing? | Yes. `tag-published` printed `no version went live since the last run`, `plan` printed `skip    @fronthub/arrowz-rehearsal@0.0.0`, and `build`, `smoke` and `stage` were skipped. | [run 38231811594](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38231811594) |
| Q17 | Does "Re-run failed jobs" stage the tarballs of the original run once the trusted publisher is right? | | |
| Q18 | Does a stage over OIDC work on a package set to "Require two-factor authentication and disallow tokens"? | | |
