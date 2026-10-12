# arrowz-rehearsal

A rehearsal of the release workflow of [Arrowz](https://github.com/Fronthub-pl/arrowz)
on a throwaway package, `@fronthub/arrowz-rehearsal`. Nothing here is for use.

The rehearsal ran on 12 October 2026 and is over: every question below has its
answer. Afterwards the package was deprecated and then deleted from npm by its
maintainer, so the registry no longer answers for it and the readings of
`npm view` below cannot be repeated; the workflow runs and their logs remain.

Arrowz publishes its packages by staging them on npm from GitHub Actions, and a
maintainer approves each staged version with a second factor. Before the first
real release, this repository ran that flow once for real, to see what npm does
where its documentation left a question open. The answers are in
[Results](#results).

## How this repository relates to Arrowz

`derive.ts` writes three files from Arrowz, at the paths they have there. The
rehearsal ran on files derived from commit `8466f99`; they derive unchanged
from `f668be4`, which carries the fix of fault F1:

- `.github/workflows/release.yml`
- `packages/engine/scripts/release.ts`
- `packages/engine/scripts/pack-check.ts`

```sh
deno run --allow-read --allow-write derive.ts <path to an arrowz checkout>
```

It changes only the text its `SWAPS` list names, and stops when a piece of that
text is not in the source exactly as often as the list says. So the jobs
`tag-published` and `plan` are the ones Arrowz runs; `stage` differs in two
names; `build` packs and judges the one package but runs no other check; and
`smoke` has one leg. The whole difference from Arrowz at `f668be4`:

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
@@ -264,7 +249,7 @@
           # re-run must still reach the packages npm has not staged yet.
           failed=0
           handed=0
-          for name in engine board cli; do
+          for name in rehearsal; do
             for tgz in tarballs/fronthub-arrowz-"$name"-*.tgz; do
               if [ -e "$tgz" ]; then
                 handed=$((handed + 1))
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
| F1 | `stage` handed npm the tarball as `tarballs/fronthub-arrowz-rehearsal-0.1.0.tgz`. npm takes a path of that shape for a GitHub repository (`owner/repo`) and tried `git ls-remote ssh://git@github.com/tarballs/fronthub-arrowz-rehearsal-0.1.0.tgz.git`; nothing reached the registry. The digest check before it passed (`OK`), the first time `stage` downloaded an artifact. `npm publish` reads the path the same way. | [run 38232131979](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38232131979), job `stage`; locally `npm stage publish tarballs/x.tgz --dry-run` fails the same way and `./tarballs/x.tgz` is accepted (npm 11.16.0) | The path starts with `./`. The rehearsal ran with that fix as a swap of `derive.ts` (from the commit "The stage job hands npm each tarball as ./path" on); Arrowz carries the same two lines since its pull request 202, and the swap is gone. |
| F2 | `tag-published` could not push the tag of `0.1.0`: `! [remote rejected] … (refusing to allow a GitHub App to create or update workflow `.github/workflows/release.yml` without `workflows` permission)`. The tag belongs on the commit that set the version, and between that commit and the commit the run was on, `release.yml` had changed (the fix of F1). A probe showed the rule: the workflow's token creates a tag on the commit the run is on, also under the protected pattern `@fronthub/arrowz-*@*`, and on an older commit whose workflow files are the same; it is refused, by `git push` and by the REST API (`403 Resource not accessible by integration`), for an older commit whose workflow files differ. So any change to a workflow file between the merge of a version and the run that tags it leaves that version without a tag. | [run 38238416792](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38238416792), job `tag-published`; probe runs [38238591873](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38238591873) and [38238694278](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38238694278) | The same program run from a maintainer's checkout of `main` pushes the tag with the maintainer's own credentials: `deno run --allow-read --allow-run --allow-env packages/engine/scripts/release.ts tags` printed `tagged @fronthub/arrowz-rehearsal@0.1.0 at 9157cf1`. Tag right after approving, before any workflow change is merged. |

## Results

"Evidence" is a link to the workflow run, or the command whose output was read.
Times are UTC, on 12 October 2026.

| # | Question | What was seen | Evidence |
|---|---|---|---|
| Q1 | Does the OIDC exchange work with the `.npmrc` that `actions/setup-node` writes? | Yes. With `registry-url` set by `actions/setup-node` and no token anywhere, `npm stage publish` (npm 11.19.0) authenticated through the trusted publisher and staged `0.1.0`: `+ @fronthub/arrowz-rehearsal@0.1.0 (staged with id …)`. | [run 38232520179](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38232520179), attempt 3, job `stage` |
| Q2 | What does `stage` print, and how does it end, when the package does not exist on npm? | npm 11.19.0 packs the notice, prints `Staging to https://registry.npmjs.org/ with tag latest and public access`, then fails with `npm error code E401` and `Unable to authenticate, your authentication token seems to be invalid.` (not `ENEEDAUTH`). The step prints `npm did not stage tarballs/fronthub-arrowz-rehearsal-0.1.0.tgz` and the job is red. In the same run `plan` read npm's `E404` for the missing package as "not published" (`release @fronthub/arrowz-rehearsal@0.1.0`), with the npm of the runner image. | [run 38232520179](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38232520179), job `stage` |
| Q3 | What does `stage` print when one field of the trusted publisher is wrong? | Exactly what it prints when the package does not exist (Q2): `npm error code E401`, `Unable to authenticate, your authentication token seems to be invalid.`, then `npm did not stage …` and a red job. The entry had the environment name `npn` in place of `npm`; nothing in the log tells a wrong field from a missing entry. | [run 38232520179](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38232520179), attempt 2, job `stage` |
| Q4 | Does `npm stage publish` from a logged-in laptop create a package that does not exist, and does the package stay after its only staged version is rejected? | Yes to both. The stage created the package: npmjs.com showed it at once with the version `0.0.0-stage` ("Temporary Holding Version", public) and a Settings tab that offers Trusted Publisher and Publishing access. The registry answered `404` for the whole package for some minutes after the stage (still at 10:05Z for a stage made at 10:01:46Z) and had the record by 10:15Z: `versions: ["0.0.0-stage"]`, `dist-tags.latest: "0.0.0-stage"`, `stub: true`, created 10:01:45Z. After `npm stage reject` of the only staged version, `npm stage list` printed `No staged versions`, and the package and its `0.0.0-stage` stayed. | the maintainer's `npm stage publish`, `npm stage reject` and `npm stage list`, screenshots of the package page and its Settings, and `npm view @fronthub/arrowz-rehearsal --json --userconfig=/dev/null` at 10:05Z and 10:15Z on 2026-10-12 |
| Q5 | What does `npm view <name>@<version> version --json` answer for a version that is staged and not approved? | npm reports it as missing. With `0.1.0` staged by the workflow and the package known to the registry, `npm view …@0.1.0 version --json` ends with status 1 and `E404`, `No match found for version 0.1.0`: asked anonymously under npm 11.16.0 and npm 10, and asked as the logged-in owner. The package record lists only `0.0.0-stage`. So a run before the approval does not tag the version, and plans it again. (The first reading, on `0.0.0` four minutes after the stage from the laptop, also said `E404`, but then the registry did not know the package at all.) | `npm view @fronthub/arrowz-rehearsal@0.1.0 version --json --userconfig=/dev/null`, `npx -p npm@10 npm view …`, and the same without `--userconfig`, at 10:27Z, one minute after the stage |
| Q6 | The error and the exit status of `npm stage publish` for a version that is already staged | `npm error code E409` and `409 Conflict - POST https://registry.npmjs.org/-/stage/package/@fronthub%2farrowz-rehearsal - Cannot stage previously published version "<version>".`; the command ends with status 1. The message says "previously published" of a version that is only staged. Seen on the laptop (`0.0.0`, npm 11.16.0) and in the workflow (`0.1.0`, npm 11.19.0): a run started before the approval tagged nothing (`no version went live since the last run`), planned the version again (`release @fronthub/arrowz-rehearsal@0.1.0`), and its `stage` printed the error, then `npm did not stage tarballs/fronthub-arrowz-rehearsal-0.1.0.tgz`, and ended red. Before the refusal npm had signed a second provenance statement and published it to the transparency log. | the second `npm stage publish` on the laptop; [run 38236459795](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38236459795), job `stage` |
| Q7 | Can a rejected version number be staged again? | Yes. `0.1.1` was staged by the workflow, rejected by the maintainer (`npm stage reject`), reported as missing by `npm view` (`E404`), and staged again by the next run under a new stage id. So a staged version with the wrong files can be rejected and the same number released again. | [run 38239251397](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38239251397) (first stage), [run 38239599187](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38239599187) (staged again) |
| Q8 | Does staging alone count as the first publish for the two-day rule of a trusted publisher? | Yes, by the status the page shows: the entry said "Pending validation" when it was created and "Valid" right after the first stage through it, with nothing approved. (The entry had first been saved with a wrong environment name and was then edited, not created again; npm allowed the edit of that optional field.) Not checked: that a valid entry is still valid after two days without an approval; the rehearsal ended the same day. | the maintainer's reading of the Settings page before the stage and a screenshot after it (`Fronthub-pl/arrowz-rehearsal`, `release.yml`, `npm`, Permissions: npm stage publish, Status: Valid), 2026-10-12 |
| Q9 | Does npm run a lifecycle script when it stages a tarball? | No. The placeholder's manifest has the scripts `prepublishOnly`, `publish` and `postpublish`, each printing a marker; `npm stage publish <tarball>` without `--ignore-scripts` printed none of them. | the output of the first `npm stage publish ./fronthub-arrowz-rehearsal-0.0.0.tgz --access public` on the laptop (npm 11.16.0): it ends with `+ @fronthub/arrowz-rehearsal@0.0.0 (staged with id …)` |
| Q10 | Does a stage over OIDC carry provenance, and does the package page show it after approval? | Yes. The stage over OIDC printed `Signed provenance statement with source and build information from GitHub Actions` and `Provenance statement published to transparency log`, and `npm stage view` showed the version as staged by "GitHub Actions (trusted automation)" with the shasum the `stage` step printed. After the approval the registry lists `dist.attestations` with `provenance.predicateType: https://slsa.dev/provenance/v1`, and the attestations endpoint returns the bundle. | [run 38232520179](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38232520179), attempt 3; `npm stage view <id>`; `npm view @fronthub/arrowz-rehearsal@0.1.0 dist --json --userconfig=/dev/null` and `https://registry.npmjs.org/-/npm/v1/attestations/@fronthub%2farrowz-rehearsal@0.1.0` at 10:46Z |
| Q11 | Is `latest` the approved `0.1.0`, whatever form the placeholder took? | Yes. Right after `npm stage approve`, `dist-tags.latest` was `0.1.0`; the holding version `0.0.0-stage` stays in the list of versions and no longer has the tag. Nothing had to be moved by hand. | `npm view @fronthub/arrowz-rehearsal dist-tags versions --json --userconfig=/dev/null` at 10:46Z |
| Q12 | Is the release tag created under the tag ruleset, on the commit that set the version? | In part. The ruleset lets the workflow's token create a tag of the protected pattern, and `release.ts tags` puts the tag on the commit that set the version (`9157cf1`, "Version 0.1.0"; the remote shows `refs/tags/@fronthub/arrowz-rehearsal@0.1.0` at that commit). But the job itself could not push this tag, because a workflow file had changed since that commit: see fault F2. The tag was pushed by the same program from a checkout, with the maintainer's credentials. | [run 38238416792](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38238416792); probe run [38238591873](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38238591873) (the tag `@fronthub/arrowz-probe@0.0.0`); `git ls-remote --tags origin` |
| Q13 | Does "Re-run all jobs" pass with `overwrite: true` on the upload? | Yes. In the second attempt `build` read the digests back and uploaded the artifact again without an error; `plan` and `tag-published` ran again and decided the same. | [run 38232131979](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38232131979), attempt 2 |
| Q14 | What does the "Allowed actions" field of the trusted-publisher form ask for? | The form (Settings, Trusted Publisher, GitHub Actions) has Publisher, an optional Label, Organization or user, Repository, Workflow filename and Environment name. Under "Allowed actions" it says `npm stage publish` is always allowed, and offers two boxes, both unticked by default: "Allow npm publish" and "Allow npm dist-tag". Staging only is the form with both left unticked. A notice says the provider and the required fields cannot be changed later, only deleted and created again. A new entry shows "Pending validation". The package setting is worded "Require two-factor authentication and disallow bypass 2fa tokens (recommended)"; the other option is the default. | the maintainer's screenshots of the form and of the Settings page, 2026-10-12 |
| Q15 | Is `npm publish` from the workflow refused when the entry allows staging only? | Yes, it is refused. For one run the `stage` step called `npm publish --ignore-scripts ./tarballs/fronthub-arrowz-rehearsal-0.1.1.tgz` through the same entry ("Allow npm publish" unticked). npm signed a provenance statement, then answered `npm error code E403`, `403 Forbidden - PUT https://registry.npmjs.org/@fronthub%2farrowz-rehearsal - OIDC permission denied for this action`; the job ended red, and `0.1.1` is not in the registry (`E404`, `latest` still `0.1.0`). The workflow was put back by a revert, and `git diff e827608 HEAD -- .github/workflows/release.yml packages/engine/scripts/` is empty. | [run 38239020404](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38239020404), job `stage`; `npm view @fronthub/arrowz-rehearsal@0.1.1 version --json --userconfig=/dev/null` after it |
| Q16 | Is a run by hand at `0.0.0` green, planning nothing? | Yes. `tag-published` printed `no version went live since the last run`, `plan` printed `skip    @fronthub/arrowz-rehearsal@0.0.0`, and `build`, `smoke` and `stage` were skipped. | [run 38231811594](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38231811594) |
| Q17 | Does "Re-run failed jobs" stage the tarballs of the original run once the trusted publisher is right? | Yes. "Re-run failed jobs" ran `stage` alone (the other jobs keep their first start times), `stage` received the digests of the first attempt and the artifact, its check printed `tarballs/fronthub-arrowz-rehearsal-0.1.0.tgz: OK`, and with the entry corrected it staged the tarball `build` had made 35 minutes earlier. | [run 38232520179](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38232520179), attempts 2 and 3 |
| Q18 | Does a stage over OIDC work on a package set to "Require two-factor authentication and disallow tokens"? | Yes. The package was set to "Require two-factor authentication and disallow bypass 2fa tokens" before the stage, and the stage over OIDC went through. The Settings page says so itself: every publishing access option is compatible with trusted publishers. | [run 38232520179](https://github.com/Fronthub-pl/arrowz-rehearsal/actions/runs/38232520179), attempt 3; the maintainer's screenshot of Publishing access |
