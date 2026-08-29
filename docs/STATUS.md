# work-charter-dsh status and recovery

Last updated: 2026-08-29

## Current state

- Phase: implementation, base exact local-artifact qualification, and dedicated L4 Standard O/P/E qualification against official DSH `dsh-v0.1.2-alpha.1` are complete. Six correction batches across seven completed native reviews have been requalified; the final post-review7 native review and local commit closeout remain. The result is still private and unreleased, and no independent semantic assessment has run.
- Repository subject: the exact 38-path release-candidate change set over parent baseline `main@8098f87e5e05413baa485efcaf391fdabb0e4e88`. Exact-file staging and local commit with message `feat: add DSH Work Charter plugin` are user-authorized; push, tag, and Release are not.
- Package identity: private `work-charter-dsh@0.1.0-alpha.1`, owned by `package.json`. The exact current release and runtime subject is `.verification/artifacts/release-prep-v0.1.0-alpha.1-post-review7-final/work-charter-dsh-0.1.0-alpha.1.tgz`, 38 entries, 97,807 bytes, npm SHA-1 `6eef542ca52f6adc67ba633f1c93e7d61ab91b38`, SHA-256 `ec181b694822bc2887bbfa2ff33c189cbcf2251778d81dd5753b107ceda1285e`.
- Current sole writer: the current root Codex task, limited to native-review correction, exact requalification, canonical evidence synchronization, and the separately authorized release gates.
- Authorized effects used: command-local pnpm `11.7.0`; task-local DSH/scdp/Work Charter dependency installation, build, pack, clean-consumer, runtime/browser/L4 fixtures, caches, artifacts, same-contract fixture fixes, canonical evidence updates, the user-approved MIT license selection, exact-file staging, and local commit closeout.
- Excluded effects remain excluded: DSH tracked-source changes, ordinary scdp checkout changes, push, pull/rebase/merge, tag, Release, publication, global installation/configuration, and unrelated cleanup.

## Bound dependencies

- `WC-UPSTREAM`: installed Codex Skill `junwei529/work-charter` `0.3.0`, package SHA-256 `7b67ea1f7073fa66ac91c36f3e39c735b54c04174e2fa3672068f8fa8948a5b2`, normalized package tree `0ac3cbb0f1fa8fa51d8f832c8127eabc9863ec9e`.
- DSH: task-owned clean detached checkout `.verification/dsh-v0.1.2-alpha.1`, exact tag `dsh-v0.1.2-alpha.1`, commit `cd5ef8148158c3a752a658978873241fdf8e2bbc`. Its official build and 241-package release pack completed without tracked-source drift.
- Coordination dependency: private `session-coordinator-dsh@0.1.1-alpha.1`, public contract `3`, logical schema `2`, in isolated dirty worktree `.verification/scdp-dsh-v0.1.2-alpha.1`, branch `codex/dsh-v0.1.2-alpha.1-compat`, starting at `33f0790ef28adf0befeee82a828684c6b77ea03b`. The final 31-entry, 96,927-byte local artifact SHA-256 is `ef18c05c831908e82d7c13b32d55dfe1a5bad5cb3bba507bf2333a7c7d9b4389`; its writer is `none`.
- Registry boundary: the exact alpha.1 DSH packages and scdp candidate are not published to npm. The accepted graph is assembled only from locally packed candidates and exact-tag DSH artifacts. Public-registry installation and formal release reproducibility remain `BLOCKED`, not failed and not accepted.

## What is implemented

- Authoritative Host state with strict runtime schemas, compare-and-set revisions, role/writer policy, current Workstream-member revalidation, evidence/decision/notice state, unique checkpoint-per-route notices, latest-result acceptance gating, and fail-closed transitions.
- Plugin-owned storage with metadata/row validation and explicit incompatible or unknown states.
- Public-contract-only scdp integration for Workstream/Session validation, addressed Result Notices, causal dispositions, delivery state, idempotency, and unknown/conflict recovery.
- A DSH Skill, five model tools, and bounded active/paused runtime context reconstructable from the DSH Session log.
- Host Node ESM, generated Typert/Remote declarations, and DSH lazy-CJS Client packaging with exact peer/development identities.
- Additive global and per-Session read-only browser UI that leaves authoritative mutation on the Host/model-tool path and leaves DSH goal, plan, workflow, approval, Conversation, Trajectory, root/sidebar, and scdp ownership outside Work Charter authority.
- Alpha.1 split-Client adaptation using public Cordis, API Remotes, UI Renderer, UI Session, Conversation, Layout, and Sidebar faces; the removed aggregate Client runtime is absent.

## Qualification checkpoint

- Work Charter `build`, strict `typecheck`, `lint`, and full tests pass at 5 files / 28 tests. Unit coverage proves that an open material decision rejects a new Result Notice before any scdp write or Charter revision, detached actors or unavailable membership state reject every Workstream transition without changing the Charter, duplicate/pending route checkpoints fail before transport, a non-accepted latest result blocks accepted close and Standard phase advancement, and a later accepted corrected checkpoint restores closure. The exact release candidate includes the approved MIT license, bundled-dependency notice, repository metadata, and all six completed native-review correction batches.
- The scdp candidate `build`, strict `typecheck`, `lint`, and full tests pass at 8 files / 92 tests; public contract `3`, schema `2`, and Host/storage behavior are preserved.
- A fresh consumer installs 81 local artifacts: 79 distinct DSH packages all at `0.1.2-alpha.1`, scdp, and Work Charter. Cordis `4.0.1`, React `18.3.1`, scdp, and Work Charter each resolve to one installed path. Its strict NodeNext typecheck uses `skipLibCheck: false` and passes.
- Real Cordis Loader/runtime PASS on the exact release candidate in run `eed77ec3-a7b7-4e62-897d-b519cf48ee7e`: Workstream Charter creation, stale/unauthorized rejection, Host/model-tool mutation plus the exact four-method read-only Remote surface, Result Notice/disposition delivery, closed-state rejection, idempotency/conflict handling, JSON and JSONL persistence, application restart, Session-log context recovery, atomic accepted-close writer release, and Loader disposal/reload.
- Dedicated L4 Standard O/P/E PASS on the exact release candidate in run `4f4192f5-cdb1-455c-a7fd-cccb21946673`: three distinct real O/P/E AgentLoops received active `standard-ope` context; O→P, P→E, E→P, P→E, P→O, and O→P all used the Work Charter/scdp path, reached durable `acknowledged` state, and were consumed by the target role model. P→O is accepted only after the latest execution result has an accepted disposition, and both phase records preserve the causal chain.
- Real Chromium `149.0.7827.55` PASS on the exact release candidate: `WC 1`, global/per-Session actions, Host-authoritative read-only overlay, scdp/native owner preservation, zero leaked requests, and Work Charter Client dispose/reload.
- Exact hashes, run identities, commands, correction history, screenshot, and limitations are in `docs/VERIFICATION.md`.

## Open facts and blockers

- L4 proves the bounded deterministic Standard O/P/E role, policy, causal-delivery, and AgentLoop-consumption path on the exact final local graph. It does not establish natural-language model quality, broad Work Charter efficacy, or independent semantic acceptance.
- No controlled upstream-baseline/candidate comparison or independent semantic assessment has run. Overall Work Charter efficacy and v1 semantic acceptance remain `UNKNOWN`/open.
- Browser evidence proves real Work Charter/scdp/DSH infrastructure plus additive ownership. Six native-feature entries are fixture ownership sentinels, not full semantic end-to-end tests of goal/plan/workflow/approval/Conversation/Trajectory.
- The alpha.1 scdp lock remains the historical rc.2 lock by design; unpublished local artifacts would otherwise write absolute machine paths into a formal lock. Neither candidate has a completed two-producer release-reproducibility result for this alpha.1 graph.
- DSH's packed `@deepseek-ai/dsh-client-ui-primitives` manifest references a missing `lib/index.js.map`; Vite warns, while relevant transforms/tests/runtime pass. The clean upstream checkout was not modified.
- Compatibility with later DSH versions, Node 22, other storage providers, multi-process/cross-host behavior, registry installation, full native-feature browser semantics, publication, and production support remains `UNKNOWN`.
- MIT is selected with `Copyright (c) 2026 junwei529`; the root `LICENSE` and package SPDX metadata are part of the release candidate. The Client source map identifies Zod `4.4.3` as the sole bundled third-party package, and its MIT grant is preserved in `THIRD_PARTY_NOTICES.md`.

## Next safe action

The post-review7-final release candidate has passed producer, clean-consumer, base runtime, browser, and dedicated L4 requalification after the seventh review's two P1 corrections. Complete one post-correction native review against the stable exact diff. If it has no finding, use the existing user authorization to stage the exact 38-path set and create the local commit; if that commit already exists on recovery, do not repeat it. Then stop before push. The approved release shape uses MIT and the proposed standalone annotated tag `v0.1.0-alpha.1`; push, tag creation, and GitHub Pre-release remain separately gated. Independent directions remain separately gated: controlled comparison plus independent semantic assessment; a publishable dependency/lock and two-producer release qualification; npm publication; or qualification against another DSH ref.

## Recovery read order

Read `AGENTS.md`, `README.md`, `docs/SPEC.md`, this file, and `docs/VERIFICATION.md`. Then:

1. revalidate repository, branch, HEAD, index, dirty files, and writer ownership;
2. revalidate the exact upstream Work Charter, DSH, scdp, candidate-artifact, and clean-consumer lock identities above;
3. preserve the current root and isolated scdp working trees byte-for-byte unless a new action is explicitly authorized;
4. inspect the latest result and limitations in `docs/VERIFICATION.md`;
5. resume only at a user-selected next direction; do not infer commit, release, publication, cleanup, evaluation, or a new DSH target from the completed local qualification.
