# work-charter-dsh status and recovery

Last updated: 2026-08-30

## Current state

- Phase: base exact local-artifact qualification, dedicated L4 Standard O/P/E qualification, and the DSH bundle-install correction against official DSH `dsh-v0.1.2-alpha.1` are complete. The correction is Git-bound: while the exact eight paths below remain dirty or untracked, final native review and one follow-up local commit are pending; a verified expected commit plus clean tree closes that window. The result remains private and not yet publicly released, and no independent semantic assessment has run.
- Repository subject: release-qualification commit `dae0362b15dc62278f16754ec6fc7ac3c5a92aa9` over public baseline `main@f734c2a6e2b8bb8e57475365d6d165f1d4f41d5c` on branch `codex/wcdp-v0.1.0-alpha.1-release`, plus the exact eight-path bundle correction currently under review. The approved follow-up local commit message is `fix: add installable DSH bundle manifest`; recovery must verify Git rather than infer that commit from this text. Push, tag, GitHub Release, and npm publication are not authorized and did not occur.
- Package identity: private `work-charter-dsh@0.1.0-alpha.1`, owned by `package.json`. The exact current release and runtime subject is `.verification/release-readiness/final/work-charter-dsh-0.1.0-alpha.1.tgz`, 39 entries, 98,593 bytes, npm SHA-1 `74a13559a6acf689d941584d144ab966668a43a6`, SHA-256 `40b2b176ad44a5ab888f36c555ad26ac23fe87aac7ed228a75717db2ac6f711b`, and SHA-512 `6c8350817e4429dd1e6b0998fe584b2576dc403d728315094ed69ee340fe38996f6227d2d24ac3520b9d74490b804deb879591f435f18e29eeb82b9007c32ea7`.
- Writer disposition: while the bundle-correction paths are dirty or untracked, the current root Codex task is the only writer through final review, exact-file staging, and the approved local commit. A verified expected commit plus clean tree closes that writer window and leaves repository writer `none`.
- Authorized effects: command-local pnpm `11.7.0`; task-local dependency acquisition/installation, build, pack, clean-consumer, runtime/browser/L4 fixtures, caches and artifacts; same-contract verification fixes; canonical evidence updates; exact-file staging; and one local commit.
- Excluded effects remain excluded: DSH or scdp tracked-source changes, push, pull/rebase/merge, tag creation or push, GitHub Release, npm publication, global installation/configuration, and unrelated cleanup.

## Bound dependencies

- `WC-UPSTREAM`: installed Codex Skill `junwei529/work-charter` `0.3.0`, package SHA-256 `7b67ea1f7073fa66ac91c36f3e39c735b54c04174e2fa3672068f8fa8948a5b2`, normalized package tree `0ac3cbb0f1fa8fa51d8f832c8127eabc9863ec9e`.
- DSH: task-owned clean detached checkout `.verification/dsh-v0.1.2-alpha.1`, exact tag `dsh-v0.1.2-alpha.1`, commit `cd5ef8148158c3a752a658978873241fdf8e2bbc`. Its official build and 241-package release pack completed without tracked-source drift. The complete 241-tarball plus publish-order manifest has 242 rows and SHA-256 `b8aa5da1d0fec2abd7bf581819d7638de6e859adfd60c530a466b1c7ff90b1c6`.
- Coordination dependency: private `session-coordinator-dsh@0.1.1-alpha.1`, public contract `3`, logical schema `2`, accepted source commit `8bed40f3e18b106c69e3dadbef6f029092e73424`, and public GitHub Pre-release tag `v0.1.1-alpha.1`. The exact published 31-entry, 97,138-byte artifact copied under `.verification/release-inputs/session-coordinator-dsh-v0.1.1-alpha.1-published/` has SHA-256 `9575d1edf782f16b2d87b49bc27e290ecf841fa607a7d4a4468a41de2389b269` and SHA-512 `2cffe633734aea39989dd28d70e811536dd54aace5038b87ece3416013809fabf1394e053559e2f6c9b61c67f35ecd22a10972621cb3bdf79b097dd0bc2df2df`.
- Registry boundary: the exact alpha.1 DSH packages and scdp package are not published to npm. WCDP release production and consumer qualification therefore use the exact local DSH artifacts plus the checksum-bound public scdp GitHub asset. Ordinary registry-backed installation remains `BLOCKED`; local two-producer release reproducibility is accepted only for this exact graph.

## What is implemented

- Authoritative Host state with strict runtime schemas, compare-and-set revisions, role/writer policy, current Workstream-member revalidation, evidence/decision/notice state, unique checkpoint-per-route notices, latest-result acceptance gating, and fail-closed transitions.
- Plugin-owned storage with metadata/row validation and explicit incompatible or unknown states.
- Public-contract-only scdp integration for Workstream/Session validation, addressed Result Notices, causal dispositions, delivery state, idempotency, and unknown/conflict recovery.
- A DSH Skill, five model tools, and bounded active/paused runtime context reconstructable from the DSH Session log.
- Host Node ESM, generated Typert/Remote declarations, and DSH lazy-CJS Client packaging with exact peer/development identities.
- An installable DSH bundle declaration whose packaged `cordis.patch.yml` mounts the plain scdp profile dependency before the WCDP policy layer.
- Additive global and per-Session read-only browser UI that leaves authoritative mutation on the Host/model-tool path and leaves DSH goal, plan, workflow, approval, Conversation, Trajectory, root/sidebar, and scdp ownership outside Work Charter authority.
- Alpha.1 split-Client adaptation using public Cordis, API Remotes, UI Renderer, UI Session, Conversation, Layout, and Sidebar faces; the removed aggregate Client runtime is absent.

## Qualification checkpoint

- Work Charter `build`, strict `typecheck`, `lint`, and full tests pass at 6 files / 33 tests. The added release tests fail closed on metadata, package-file, path/source-map, license, DSH/scdp binding, generated-lock, provenance, and concurrent final-evidence drift.
- `release:reproduce` and `release:audit` PASS. Two isolated offline/frozen producers used the same generated source-bound lock and prepared frozen store, produced byte-identical 39-entry tarballs and identical package manifests, and recorded 26 source rows, 39 package rows, the complete 242-row DSH manifest, the exact public scdp artifact, and unsigned provenance. The final four files are retained under `.verification/release-readiness/final/`.
- The published scdp candidate's final qualification passed `build`, strict `typecheck`, `lint`, and 8 files / 93 tests; public contract `3`, schema `2`, and Host/storage behavior are preserved. Its runtime JS, declarations, source maps, and package manifest are byte-identical to the older WCDP qualification input; only four packaged documentation files changed.
- Exact DSH CLI/profile installation PASS at `.verification/dsh-profile-install-v0.1.0-alpha.1-r1`: pnpm `11.7.0` installed the published scdp and final WCDP tarballs into one fresh profile, recorded WCDP after `@deepseek-ai/dsh-base` in `dsh.profile.bundles`, composed scdp before WCDP, and an actual profile boot returned scdp contract `3` / schema `2` plus WCDP contract `1` / schema `1` from the mounted Host services.
- A fresh frozen/offline consumer at `.verification/clean-consumer-release-v0.1.0-alpha.1-r2` installs 81 local artifacts: 79 distinct DSH packages all at `0.1.2-alpha.1`, published scdp, and the final WCDP tarball. Cordis `4.0.1`, React `18.3.1`, scdp, and WCDP each resolve to one installed path. Its 347,320-byte lock has SHA-256 `eb3e092249d87374c1237b088bd2a880d2a9fcb2455ee95582fc88fb53ffd19e`; strict NodeNext typecheck with `skipLibCheck: false` passes.
- Real Cordis Loader/runtime PASS on the final artifact in run `a6fe68de-71a7-41d9-b74c-61fd2801719c`: Workstream Charter creation, stale/unauthorized rejection, Host/model-tool mutation plus the exact four-method read-only Remote surface, Result Notice/disposition delivery, closed-state rejection, idempotency/conflict handling, JSON and JSONL persistence, application restart, Session-log context recovery, atomic accepted-close writer release, and Loader disposal/reload.
- Dedicated L4 Standard O/P/E PASS on the final artifact in run `6e136d76-f1da-4ba4-88fe-24c182180278`: three distinct real O/P/E AgentLoops received active `standard-ope` context; O→P, P→E, E→P, P→E, P→O, and O→P all used the Work Charter/scdp path, reached durable `acknowledged` state, and were consumed by the target role model. P→O is accepted only after the latest execution result has an accepted disposition, and both phase records preserve the causal chain.
- Real Chromium `149.0.7827.55` PASS on the final artifact: `WC 1`, global/per-Session actions, Host-authoritative read-only overlay, scdp/native owner preservation, zero leaked requests, and Work Charter Client dispose/reload. The 44,547-byte screenshot SHA-256 is `5f9b5c6d18ac57e481ab6939694fe8c1c24ddf4866a2c2131674d09ceec7ed4d`.
- Exact hashes, run identities, commands, correction history, screenshot, and limitations are in `docs/VERIFICATION.md`.

## Open facts and blockers

- L4 proves the bounded deterministic Standard O/P/E role, policy, causal-delivery, and AgentLoop-consumption path on the exact final local graph. It does not establish natural-language model quality, broad Work Charter efficacy, or independent semantic acceptance.
- No controlled upstream-baseline/candidate comparison or independent semantic assessment has run. Overall Work Charter efficacy and v1 semantic acceptance remain `UNKNOWN`/open.
- Browser evidence proves real Work Charter/scdp/DSH infrastructure plus additive ownership. Six native-feature entries are fixture ownership sentinels, not full semantic end-to-end tests of goal/plan/workflow/approval/Conversation/Trajectory.
- The tracked alpha.1 scdp lock remains historical by design, while WCDP's release provenance embeds a generated source-bound lock with relative artifact locations and exact integrity. That generated lock is evidence, not a replacement tracked dependency lock.
- DSH's packed `@deepseek-ai/dsh-client-ui-primitives` manifest references a missing `lib/index.js.map`; Vite warns, while relevant transforms/tests/runtime pass. The clean upstream checkout was not modified.
- Compatibility with later DSH versions, Node 22, other storage providers, multi-process/cross-host behavior, registry installation, full native-feature browser semantics, and production support remains `UNKNOWN`. Public WCDP publication has not occurred.
- MIT is selected with `Copyright (c) 2026 junwei529`; the root `LICENSE` and package SPDX metadata are part of the release candidate. The Client source map identifies Zod `4.4.3` as the sole bundled third-party package, and its MIT grant is preserved in `THIRD_PARTY_NOTICES.md`.

## Next safe action

If the exact eight paths remain dirty or untracked, complete final native review and the approved follow-up local commit; if the expected commit already exists and the tree is clean, do not repeat it and stop before push. Only after that Git-bound checkpoint is complete does the next available direction become a refreshed, separately authorized public-publication preflight and external packet using the standalone annotated tag `v0.1.0-alpha.1`, a GitHub Pre-release, and the exact four files under `.verification/release-readiness/final/`. Controlled semantic assessment, npm publication, and qualification against another DSH ref also remain separately gated.

## Recovery read order

Read `AGENTS.md`, `README.md`, `docs/SPEC.md`, this file, and `docs/VERIFICATION.md`. Then:

1. revalidate repository, branch, HEAD, index, and worktree; when the commit containing this status is present and the tree is clean, preserve writer `none` and do not repeat it;
2. revalidate the exact upstream Work Charter, DSH, published scdp asset, final WCDP artifact, provenance, and clean-consumer lock identities above;
3. preserve the current root, exact DSH/scdp subjects, and retained ignored evidence byte-for-byte unless a new action is explicitly authorized;
4. inspect the latest result and limitations in `docs/VERIFICATION.md`;
5. resume only at a user-selected next direction; do not infer push, tag, GitHub Release, npm publication, cleanup, evaluation, or a new DSH target from the completed local qualification.
