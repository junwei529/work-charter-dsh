# work-charter-dsh verification

This file owns verification methods, evidence identities, results, and limitations. Documentation, static checks, local-artifact runtime evidence, and model self-report are distinct evidence classes. None of them alone establishes semantic efficacy or release acceptance.

## Evidence identities

- Repository parent baseline: public `main@f734c2a6e2b8bb8e57475365d6d165f1d4f41d5c`; the release-qualification subject is the exact seven-path change on `codex/wcdp-v0.1.0-alpha.1-release` committed with this document after final native review.
- `WC-UPSTREAM`: installed Codex Skill receipt revalidated on 2026-08-29 as `junwei529/work-charter` `0.3.0`; package SHA-256 `7b67ea1f7073fa66ac91c36f3e39c735b54c04174e2fa3672068f8fa8948a5b2`; normalized package tree `0ac3cbb0f1fa8fa51d8f832c8127eabc9863ec9e`; installed `SKILL.md` SHA-256 `c750d51940456b110bc7ed4b7d490690f42ca8ee9b555c23c8fe3d4d056b4dba`.
- DSH source/build producer: task-owned clean detached checkout `.verification/dsh-v0.1.2-alpha.1`, official tag `dsh-v0.1.2-alpha.1`, commit `cd5ef8148158c3a752a658978873241fdf8e2bbc`.
- DSH local artifact set: 241 tarballs plus publish order under `.verification/artifacts/dsh-v0.1.2-alpha.1`; the complete 242-row fixed manifest SHA-256 is `b8aa5da1d0fec2abd7bf581819d7638de6e859adfd60c530a466b1c7ff90b1c6`. The root `@deepseek-ai/dsh@0.1.2-alpha.1` tarball is 15,267 bytes with SHA-256 `95d12c190d169c99db15d8958b034004489b6b43a0cb50879f885102bb18ed32`.
- scdp accepted source: private `session-coordinator-dsh@0.1.1-alpha.1`, public contract `3`, logical schema `2`, clean isolated worktree `.verification/scdp-dsh-v0.1.2-alpha.1`, branch `codex/dsh-v0.1.2-alpha.1-compat`, commit `8bed40f3e18b106c69e3dadbef6f029092e73424`, and public GitHub Pre-release tag `v0.1.1-alpha.1`.
- scdp public artifact: `.verification/release-inputs/session-coordinator-dsh-v0.1.1-alpha.1-published/session-coordinator-dsh-0.1.1-alpha.1.tgz`, 31 entries, 97,138 bytes, SHA-256 `9575d1edf782f16b2d87b49bc27e290ecf841fa607a7d4a4468a41de2389b269`, SHA-512 `2cffe633734aea39989dd28d70e811536dd54aace5038b87ece3416013809fabf1394e053559e2f6c9b61c67f35ecd22a10972621cb3bdf79b097dd0bc2df2df`. Compared with the older local WCDP input, its package path set and every runtime JS, declaration, source map, and package-manifest byte are identical; only `CHANGELOG.md`, `README.md`, `SECURITY.md`, and `THIRD_PARTY_NOTICES.md` changed.
- `WC-DSH-PRE-REVIEW-L4`: the earlier private `work-charter-dsh@0.1.0-alpha.1` L4 artifact `.verification/artifacts/work-charter-dsh-0.1.0-alpha.1.tgz`, 34 entries, 103,088 bytes, npm SHA-1 `2dbfc44ec756f65120ccec096d3b01507b778a63`, SHA-256 `8879ecc345b279dfa7354208c5b40884896af733e1e9170ef6143765089240a9`, is retained as historical evidence and is not the release subject. The pre-L4-correction failed artifact is retained under `.verification/artifacts/history/pre-l4-route-fix-d981cba5/` with its original SHA-256.
- `WC-DSH-POST-REVIEW1`: intermediate 36-entry package `.verification/artifacts/release-prep-v0.1.0-alpha.1-post-review1/work-charter-dsh-0.1.0-alpha.1.tgz`, 104,754 bytes, npm SHA-1 `437f0d2121d50c1b5788b2bdc48d4d8407ddd026`, SHA-256 `617736b18ee4bd05117e67aca613093036f322de6063fc8a8e817e5ce91bfd28`, is retained as historical evidence and is not the release subject.
- `WC-DSH-RELEASE-CANDIDATE`: exact private release and runtime subject `work-charter-dsh@0.1.0-alpha.1` at `.verification/release-readiness/final/work-charter-dsh-0.1.0-alpha.1.tgz`, 38 entries, 98,014 bytes, npm SHA-1 `0516ad077634dff156aab42af6fab9569ca8a2c4`, npm integrity `sha512-TV9rljpkuScvHalkyNWhKGYUzwNmkTUc/5zVKSxnAHZl1SJQ9cJHTH9LM/PS6xPdEGv4lxUQyZYHX2ez4kTXhQ==`, SHA-256 `72c6bf225b17aa7ae818c8f25e52377929d963caa3a8d2123e4e1e87ad9cafd7`. Its unsigned 431,077-byte provenance SHA-256 is `19d022af35f0cccdc1b03fc94b95dbceee1a529e134fab317c1222f0aa85bc03`; the final directory contains exactly that tarball, SHA-256 and SHA-512 sidecars, and provenance. The provenance binds 25 release-source rows, 38 package rows, the complete 242-row DSH manifest, the public scdp asset, exact pnpm shim, generated lock, and two frozen/offline producers.
- Final clean consumer: `.verification/clean-consumer-release-v0.1.0-alpha.1-r1`; its 347,320-byte lockfile SHA-256 is `5165094be25fef642696d7b76cbb7714936a980c2d9cf78c4964d8e84a8f33ce`. The retained setup generator is `.verification/release-readiness/setup-clean-consumer-v0.1.0-alpha.1.mjs`, 6,186 bytes, SHA-256 `34cc93207b3a6ec66911be41fe6e18608bb8e0911eb0bee51cb6be9c867e5899`.
- L4 fixture: `scripts/qualify-l4-runtime.mjs`, SHA-256 `9d95dc673fa8b1e9cf254fb062ec69a58a1a1f4ce4ee01e17d5fc9cd857b93ba`. It resolves every product/runtime import from the exact clean consumer and writes only under its isolated task-local profile.
- Final L4 run: `b498ebaf-953b-4de2-81dd-202d6c74271e`; result `.verification/clean-consumer-release-v0.1.0-alpha.1-r1/profile-runtime/l4/b498ebaf-953b-4de2-81dd-202d6c74271e/result.json`, 1,175 bytes, SHA-256 `dfd8b306defb1f64c5dcb0f8e7f46bfcb794da50d035bd7ac08debd6b06f9566`; Charter storage SHA-256 `961fa2c660299c840f035805c0d84736bbc1a01e168f1d2e65e0d90516fb5a57`; scdp storage SHA-256 `d1a7ffcdb4b2e2faf9b731c8c1e25a81263f2bea2de9ec58328ce892882c175f`.
- Persisted L4 cross-check: scdp storage contains exactly six `acknowledged` deliveries and no diagnostic fallback records. The phase Result Notice uses `work-charter-dsh/phase-result-notice/v1`, is caused by the accepted execution disposition record, and the returning `phase-disposition/v1` record is caused by that phase notice. Session logs contain 2 Orchestrator, 3 Planner, and 2 Executor model replies. Work Charter storage contains both notice ids with exact accepted dispositions returned by the Planner and Orchestrator respectively.
- Toolchain: Node `v24.16.0`; exact task-local pnpm `11.7.0`; producer shim `.verification/corepack/v1/pnpm/11.7.0/bin/pnpm.cjs` SHA-256 `67b035e322203961795e8e34ca63a08c37a4386eda94107fb3d28f3246d882ad`; consumer native executable SHA-256 `625c0ea2ef7dfd25e1042b19f92da6fd8f0a5b37f08abe4d8ff18977011ae019`; TypeScript `6.0.3`; tsdown `0.22.2`; Vitest `4.1.8`; ESLint `10.8.1`; Chromium `149.0.7827.55`.
- Assessor: no controlled comparison or independent semantic assessor has run.

The exact alpha.1 DSH packages and `session-coordinator-dsh@0.1.1-alpha.1` return npm Registry `404`. The accepted installation route below is therefore a task-local graph of the final WCDP tarball, the public scdp GitHub asset, and tarballs produced from the exact DSH checkout. It does not establish normal registry-backed installation; it does establish local GitHub Pre-release qualification for this exact four-asset WCDP output.

## Qualification results

| Layer | Result | Evidence boundary |
|---|---|---|
| Exact DSH producer | **PASS** | Frozen exact-tag installation, official build, and `release:pack` completed without tracked-source drift. The official build record covered 218 files at SHA-256 `d8ad3d3c39cfd2ef637d5fa978f1782da5bd61f1bf07784044c72d9996c2bcbf`; 241 package archives were emitted. This qualifies the local producer only. |
| scdp candidate producer | **PASS** | Its final qualification passed build, strict typecheck, lint, and 8 files / 93 tests. The public 31-entry artifact above is the exact WCDP dependency input. |
| Work Charter producer | **PASS** | Host ESM, Typert/Remote declarations, strict Host/Client/test typechecks, lazy-CJS Client, lint, and full test suite passed at 6 files / 33 tests. `WC-DSH-RELEASE-CANDIDATE` is the exact producer, clean-consumer, base-runtime, browser, and L4 subject. |
| Release reproducibility | **PASS** | Two isolated producers used the same normalized source snapshot, source-bound generated lock, exact DSH/scdp inputs, attempt-local prepared store, and pnpm `11.7.0`; both installs were frozen/offline and their tarballs and package manifests were identical. `release:audit` independently passes over 26 source maps and the retained final evidence. |
| Clean installed identity | **PASS** | The fresh consumer has 81 local artifact dependencies: 79 distinct `@deepseek-ai/dsh-*` packages, scdp, and Work Charter. Every DSH package is `0.1.2-alpha.1`; Cordis `4.0.1`, React `18.3.1`, scdp `0.1.1-alpha.1`, and Work Charter `0.1.0-alpha.1` each resolve to one installed path. |
| Clean package/type consumer | **PASS** | Strict NodeNext no-emit typecheck with `skipLibCheck: false` resolves public Host, Client, Remote, and type exports from packed artifacts. The Work Charter Remote declaration has exactly four read-only operations: health, Charter get/list, and per-Session list; no mutation alias is exposed. |
| Real Loader and Host policy | **PASS** | Actual Cordis Loader mounts both packages, reports Work Charter health contract `1` / storage schema `1` / scdp contract `3`, creates a Workstream Charter over three real DSH Sessions, and registers the DSH Skill plus five model tools. Model-tool actor identity comes from the executing DSH Agent, while browser Remotes are read-only. Runtime evidence covers unauthorized-role, stale-revision, and post-close disposition rejection; unit coverage additionally proves open-decision rejection, current-member validation, unique checkpoint-per-route submission, serialized route disposition, correction-aware accepted close, and latest-execution gating for Standard phase advancement. |
| scdp coordination | **PASS** | Result Notice and causally linked disposition are accepted through the public scdp service, both deliveries reach `delivered`, membership survives restart, replay is idempotent, and a conflicting immutable record is rejected. Unit coverage separately preserves `UNKNOWN` for ambiguous storage/delivery recovery. |
| Persistence/restart/recovery | **PASS** | JSON storage persists and reopens a closed accepted Charter; Workstream membership and Session-to-Charter mapping survive application restart. Loader remove/reload withdraws and restores the Host, Typert, Client, Skill, and tool contributions without rewriting ready storage. Final-artifact run `c910a855-e71a-4c99-bb52-83c192423893` exercised atomic accepted-close writer release and produced Charter SHA-256 `87139f700547078dfb469384a9aa3016e8b862f3dbfafef7197f0025c14cc24c` and coordination SHA-256 `37c02dee97778eb775c61986957800423b34a6287839a3417fe7022e3847f9a1`. |
| Logged model context | **PASS** | A keyless scripted LLM exercises the real DSH Agent loop. The DSH Session log contains active and paused Work Charter runtime snapshots plus the inactive clear marker; a restarted Agent recovers exactly that history and emits no redundant closed-state snapshot. |
| Standard O/P/E L4 | **PASS** | The final run created one active `standard-ope` Charter and three distinct real DSH O/P/E AgentLoops. O→P Mandate, P→E Definition, E→P execution Result Notice, P→E execution disposition, P→O phase Result Notice, and O→P phase disposition all used the Work Charter/scdp path, reached durable `acknowledged` state, and were consumed by the target role model. The Host requires accepted execution assessment before P→O and preserves both causal record links. No raw-scdp fallback ran or counted. |
| Browser Client | **PASS** | Real headless Chromium resolves both published lazy-CJS Client bundles and both generated Remotes. `WC 1`, the global action, per-Session action, and Host-authoritative read-only overlay render; Work Charter dispose/reload preserves scdp, root/sidebar owners, and six native ownership sentinels, leaves zero in-flight requests, and reports no console/page error. Unit coverage proves the Work Charter Remote surface has no mutation endpoint and that an exact Workstream Charter focus cannot fall back to an unrelated global Charter. Final-artifact screenshot: `.verification/clean-consumer-release-v0.1.0-alpha.1-r1/output/playwright/work-charter-dsh-coexistence.png`, 44,648 bytes, SHA-256 `ca6d240a4535977cbddae77e4b5ebb1d98156a618ed98c375d30cd26982dfb70`. |
| Source/checkout integrity | **PASS** | Exact DSH and accepted scdp checkouts remain clean; root diff checks pass apart from Git's informational LF-to-CRLF checkout advisories. The intended root release-qualification subject is exactly seven paths; ignored verification inputs, producers, consumers, caches, and outputs are not part of it. |
| Controlled comparison | **NOT RUN** | No predeclared upstream-baseline/candidate cases have been executed with equivalent non-product context. |
| Independent semantic assessment | **NOT RUN** | Role separation in the deterministic runtime fixture tests Host acceptance rules; it is not an independent judgment of Work Charter quality or efficacy. |

## Reproducible local checks

The source-contract check remains:

```powershell
npm.cmd run verify:dsh-source -- .verification\dsh-v0.1.2-alpha.1 .verification\scdp-dsh-v0.1.2-alpha.1
```

The Work Charter producer checks are:

```powershell
npm.cmd run build
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run release:reproduce
npm.cmd run release:audit
```

The isolated scdp producer used its `build`, `typecheck`, `lint`, `test`, reproduce, audit, and source-verifier routes from `.verification\scdp-dsh-v0.1.2-alpha.1`. WCDP does not rewrite that repository's tracked historical lock; its own provenance binds the exact public scdp tarball and uses a generated relative-path lock as producer evidence.

The final clean-consumer checks used `.verification/clean-consumer-release-v0.1.0-alpha.1-r1`. To reproduce them, select a fresh task-owned suffix (for example `r2`), then run:

```powershell
node .verification\release-readiness\setup-clean-consumer-v0.1.0-alpha.1.mjs .verification\clean-consumer-release-v0.1.0-alpha.1-r2
Push-Location .verification\clean-consumer-release-v0.1.0-alpha.1-r2
try {
node ..\corepack\v1\pnpm\11.7.0\bin\pnpm.cjs install --offline --frozen-lockfile --ignore-scripts --no-runtime --trust-lockfile --store-dir ..\pnpm-store
node package-identity.mjs
npm.cmd run typecheck
node runtime-qualification.mjs
npm.cmd run build:browser
node browser\browser-smoke.mjs
} finally {
  Pop-Location
}
```

`runtime-qualification.mjs` allocates a fresh run directory by default so repeated executions do not reuse a prior Charter or storage subject. `browser-smoke.mjs` likewise uses an isolated profile and stores screenshots only under `output/playwright/`.

The dedicated L4 check is run from the repository root against that exact clean consumer:

```powershell
node scripts\qualify-l4-runtime.mjs .verification\clean-consumer-release-v0.1.0-alpha.1-r1
```

The final candidate exits `0` with structured result `PASS / L4_STANDARD_OPE`. The fixture writes its exact JSON result beneath `profile-runtime/l4/<run-id>/result.json`. PASS requires all six Standard role messages to use the Work Charter/scdp path, reach durable `acknowledged` state, and be consumed by the target AgentLoop; the raw scdp diagnostic fallback is available only for a rejected phase route, is reported separately, and never counts as PASS.

## Corrections discovered by qualification

- The Work Charter Typert generator originally mirrored too little of the public scdp declaration surface. It now mirrors only scdp's public `index`, `types`, and `storage` declarations and maps the public package root; no implementation internal is imported.
- The packed Work Charter Client declaration originally exposed a DSH-augmented `PropsRuntime` alias whose augmentation imports were removed by declaration emission. A truly clean consumer resolved that alias to `never`. Public component prop aliases now use the explicit structural props actually consumed by the components.
- The alpha.1 scdp candidate uses the split Session Controller, Client Store, and UI Renderer public faces, normalizes Windows CRLF-sensitive fixture assertions, and updates the browser/Loader composition fixtures. Public contract `3`, logical schema `2`, Host semantics, storage identity, and published service shape remain unchanged.
- The browser qualification fixture initially registered an undeclared child Slot and then served unauthenticated `/api` requests through the SPA fallback. The fixture now declares the parent-child Slot relation and supplies the browser-auth credential seam, authenticated launch URL, and authorized index flow. These were fixture defects, not accepted product failures.
- After the DSH checkout gained its exact installed graph, the source verifier's recursive directory read descended into package-local `node_modules` and stopped making bounded progress. Its package index now walks source directories explicitly and skips `node_modules`; the corrected check completes with the same source-contract result.
- The first L4 fixture preflight selected the newer Work Charter runtime-context snapshot instead of the triggering user/relay message, and a later diagnostic fallback used nonexistent scdp kind `result` instead of public kind `outcome`. Both were fixture defects corrected before the pre-correction product run; neither was treated as the final L4 result. That corrected run then isolated the Host policy failure subsequently fixed below.
- The isolated product failure was a real Standard hierarchy gap: Result Notice submission admitted only the Executor writer. The correction adds only the assigned Planner→Orchestrator phase route after an accepted Executor result, binds it to the accepted execution disposition, and emits distinct phase notice/disposition schemas. Two intermediate packed probes exposed the missing forward and return schemas before the final exact artifact passed the full chain.
- Native review found three fail-closed gaps before release: a consumed one-shot evidence record could be rewritten while reusing its consumed timestamp, accepted close could be attempted directly from `draft`, and pending one-shot evidence could carry `consumedAt`. The Host now preserves the entire consumed evidence record, requires `active` state for accepted close, rejects pending evidence with consumption metadata, and covers all three paths in the 17-test suite before exact-candidate runtime, browser, and L4 requalification.
- The next completed native review found that paused-state validation prevented durable revoked/unknown authority, active writer release could strand a Charter without a reassignable writer, and a per-Session action could select an unrelated global Charter instead of its applicable Workstream Charter. Paused Charters now preserve non-approved authority while resume stays fail-closed; active Charters retain their writer until accepted close atomically releases it; and the Session action carries the exact applicable Charter id into overlay selection. The 21-test suite covers the three corrections.
- The first base-runtime run against the post-review2 package stopped because its copied fixture still performed the obsolete active writer-release step. The fresh consumer fixture was corrected to exercise atomic accepted close, and only the subsequent PASS run `06022436-c996-4d7a-a043-2f42a6fa33b8` is accepted evidence; no product change was made for that fixture-contract drift.
- The third completed native review found that browser Remote mutation calls accepted a caller-supplied actor Session id and that a pending disposition could mutate a closed Charter. The browser Remote is now strictly read-only; Host/model tools retain mutation and model tools derive actor identity from the executing DSH Agent. Closed Charters reject disposition before target resolution or scdp writes. The 23-test suite locks both corrections.
- The first post-review3 clean-consumer type and base-runtime checks stopped because copied fixtures still required the removed mutation Remote aliases. The fixtures were narrowed to the exact four-method read-only contract; only the subsequent typecheck and run `c78ca3d1-3a3c-4fc6-8eb8-878c558800f9` are accepted evidence. No product change was made for that fixture-contract drift.
- The fourth completed native review found that an active Charter could dispatch a new Result Notice while a material decision remained open. Submission now fails with `OPEN_DECISION` before route resolution or scdp writes; the DSH Skill, model-tool description, and product contract state the same boundary. The 24-test suite proves zero transport writes and no Charter revision change on rejection.
- A code-only post-review4 pack was superseded before that correction's closeout so the model-visible Skill/tool wording could carry the same open-decision boundary. The resulting post-review4-final package and run `2e27d8e1-4165-45cc-87ab-238e116d02f6` are retained as historical evidence and are not the current release subject.
- The fifth completed native review found that a Planner or Executor detached from the Workstream after activation retained transition authority. Every Workstream-target transition now reopens current scdp membership for the actor before policy mutation, and lookup failure fails closed; two regression tests cover detached Planner/Executor attempts and unavailable membership state. The 26-test suite and exact `post-review5-final` producer, clean consumer, base runtime, browser, and L4 reruns all pass.
- The sixth completed native review found no author-fixable issue and independently passed typecheck, lint, 26 tests, pack dry-run, source-contract verification, and diff checks. A subsequent staged-diff check exposed eight new files with a blank line after their valid EOF; those non-semantic whitespace defects were removed before the next review.
- The seventh completed native review found two P1 acceptance-chain gaps: a `correction-required` Result Notice did not block accepted close, and a new notice id could duplicate the same checkpoint while an older accepted execution result could still authorize Standard phase advancement. The Host now serializes each semantic route, permits only one notice per route/checkpoint, requires the latest result on every used route for accepted close, and requires the latest Executor result for Standard phase advancement. A later accepted distinct checkpoint can supersede an earlier non-accepted result without erasing history. Four focused regression paths raised the suite to 28 tests, and the exact `post-review7-final` producer, clean consumer, base runtime, browser, and L4 reruns pass.
- Release preparation first attempted an empty task-local pnpm metadata cache, then an authorized task-local metadata fetch; the latter reached the unpublished DSH package boundary and returned Registry `404`. Neither attempt produced accepted evidence. The final route deterministically normalizes the already verified installed virtual-store lock, replaces only the public scdp tarball integrity, validates all 78 DSH overrides, prepares an attempt-local store from the prequalified store, and runs both producers frozen/offline. A test-fixture newline error, one SHA-512 validator bug, and lint-only callback style findings were corrected before the final PASS.
- Release-qualification native review found that final-evidence locking originally began only after both producers finished and that STATUS prospectively declared an uncreated commit complete. The same fail-closed lock now encloses the complete reproduction and final-verification window, `release:audit` encloses its complete current-build/final-evidence inspection, concurrency tests exercise both reproduction and inspection exclusion, and STATUS uses Git-bound pending/completed language.

## Limitations and open evidence

- The local artifact graph is not evidence that a user can install the package from npm. The DSH/scdp alpha packages are unpublished and both candidates remain `private`.
- WCDP now has a completed local two-producer result on a generated source-bound lock with relative artifact paths. Its provenance is intentionally unsigned and local; it is not an identity signature, public attestation service result, npm publication proof, or compatibility claim beyond the exact bound graph.
- The browser test uses real DSH SlotRegistry, Remotes, Loader, React, and Chromium, but the goal/plan/workflow/approval/Conversation/Trajectory fixtures are ownership sentinels. It proves non-replacement and additive composition, not the complete native semantics of those six features.
- The DSH package `@deepseek-ai/dsh-client-ui-primitives` declares a missing `lib/index.js.map`; Vite reports the missing map while transformation and all relevant tests pass. This is retained as an upstream packaging warning and was not repaired in the clean DSH checkout.
- Initial restricted-network installs emitted pnpm version-metadata/supply-chain fetch warnings. The task-local graph and final evidence commands completed; `@tsdown/css@0.22.2` was added only to the ignored browser-evidence consumer after the authorized network retry, not to either product package.
- MIT is selected for `work-charter-dsh`, with the full grant included in the root and packed artifact. The Client source map identifies only Zod `4.4.3` under `node_modules`; its installed MIT text and copyright are included in `THIRD_PARTY_NOTICES.md`. At release-qualification evidence capture there was no WCDP push, tag, GitHub Release, npm publication, global installation, or global configuration change; those effects require their recorded gates.
- Compatibility with later DSH versions, Node 22, other storage providers, multi-process/cross-host coordination, full native-feature browser flows, causal efficacy, trigger quality, token savings, and production support remains `UNKNOWN`.
- The keyless L4 role adapters prove real DSH AgentLoop invocation, role-specific context, Host route/sequence enforcement, message visibility, causal records, and durable transport. They do not prove natural-language model quality, broad Work Charter efficacy, or independent semantic judgment.

## Evaluation isolation rules

- External governance may govern development but must not be injected into baseline/candidate model context.
- Upstream baseline and candidate require separate immutable identities even when they express similar text.
- Candidate self-report cannot establish activation, compliance, efficacy, compatibility, or acceptance.
- A failed transport, unavailable dependency, or invalid fixture yields the corresponding infrastructure result and leaves unobserved product behavior `UNKNOWN`.
- Repeating or replacing a bounded evaluation attempt requires its governing authority; a rename or new Session does not erase consumption.

## Evidence rules

- Record exact source, build artifact, installed copy, DSH ref, scdp version, configuration, command, result, and assessor.
- Record Node, pnpm, TypeScript, bundler, Host module format, Client factory format, and peer resolution used by evidence.
- Separate source/static checks from local-artifact runtime behavior, transcript evidence, controlled evaluation, and release proof.
- Preserve `UNKNOWN` for missing, stale, interrupted, sandbox-blocked, leaked, or identity-ambiguous evidence.
- Do not claim cross-Harness parity, causal efficacy, token savings, broad trigger accuracy, public installability, or release readiness without dedicated accepted evidence.
