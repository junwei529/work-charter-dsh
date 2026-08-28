# work-charter-dsh verification

This file owns verification methods, evidence identities, controlled evaluation results, and limitations. Documentation and static checks are not semantic efficacy evidence.

## Current evidence

| Date | Scope | Result | Limitation |
|---|---|---|---|
| 2026-08-18 | Historical DSH source-audit summary | `UNKNOWN`: exact DSH ref, source boundary, and commands were not retained in this repository | Do not use as reproducible product or compatibility evidence |
| 2026-08-18 | Historical repository-split analysis summary | `UNKNOWN`: exact scdp/DSH identities and source boundary were not retained in this repository | Architecture context only; not reproducible runtime evidence |
| 2026-08-28 | Initial public-placeholder source inventory | PASS: the five intended Markdown files exist and their local navigation targets resolve | Static repository inventory only; no package, runtime, compatibility, or efficacy behavior was exercised |
| 2026-08-28 | Public placeholder publication `WC-DSH-PUBLICATION-2026-08-28-01` | PASS: GitHub owner/repository, Public visibility, default `main`, initial commit, and public README maturity text were independently retrieved | Publication/status evidence only; no package, runtime, compatibility, release, installability, or efficacy behavior was exercised |

## Public placeholder evidence

- Public URL: `https://github.com/junwei529/work-charter-dsh`.
- GitHub owner: `junwei529` (account id `118504844`); repository id `1349673753`.
- Visibility/default branch: Public / `main`.
- Initial content commit: `078708fcb76141eb275ee89d64855932e35bc105` (`docs: publish planned placeholder`).
- Connector fetch: `README.md` from public `main`, blob `68b64bc837965b88f63438f4cbbf45e32256838f`, contained the exact label `Planned — not yet developed` and explicit no-implementation/no-installability/no-Release boundaries.
- Publication exclusions observed: no implementation source, package metadata, install instructions, license file, tag, or Release was created.

The source audit supports these bounded findings:

- DSH exposes plugin seams for services, tools, prompts, storage, approval, Session projections, and Client contributions.
- DSH Trajectory is a Session-local durable-log projection, not a policy graph or second agent loop.
- goal, plan, workflow, approval, subagent, and UI slots already have native owners that this plugin must not shadow.
- browser-only input blocking is not enforcement; Host-side validation remains required.
- scdp should own cross-Session coordination so this plugin can remain a policy consumer.

## Required verification ladder

| Layer | Required evidence |
|---|---|
| Identity binding | Exact `WC-GOVERNANCE`, `WC-UPSTREAM`, `WC-DSH-CANDIDATE`, assessor, DSH, and scdp identities/versions/hashes |
| Contract mapping | Traceable mapping from upstream Work Charter concepts to candidate schema, commands, prompt sections, and failure behavior |
| Package and types | Strict TypeScript/TSX build/typecheck/lint; `engines.node` matches the pinned DSH release; Node ESM Host import, declarations, `./client`, `dsh.client`, lazy-CJS factory/purity format, single scdp/Cordis/DSH/React peers, and clean-consumer resolution all pass |
| Unit | Charter validation, authority/writer transitions, stale revision rejection, evidence/acceptance/stop/recovery states |
| Storage restart | Charter and Workstream attachment persist and reopen; incompatible state fails explicitly |
| Host enforcement | Unauthorized/stale transitions fail closed even when the browser affordance is bypassed |
| DSH integration | Real Loader/profile with exact scdp and DSH versions; lifecycle/disposal and missing dependency failures |
| Keyless transcript/snapshot | Model-visible Charter context is logged, replayable, and absent when not activated |
| Browser | UI remains additive and coexists with goal, plan, workflow, approval, Conversation, and Trajectory |
| Controlled comparison | Predeclared baseline/candidate cases with equivalent non-product context and deterministic evidence capture |
| Independent assessment | Acceptance judgment performed outside the candidate with leakage and provenance checks |

## Evaluation isolation rules

- External governance may govern development but must not be injected into baseline/candidate model context.
- The upstream baseline and candidate need separate immutable identities even if they express similar text.
- Candidate self-report cannot establish activation, compliance, efficacy, or acceptance.
- A failed transport, unavailable dependency, or invalid fixture yields the corresponding infrastructure result and leaves product behavior `UNKNOWN`.
- Repeating or replacing a bounded evaluation attempt requires the authority defined by the evaluation contract; a rename or new Session does not erase prior consumption.

## Evidence rules

- Record exact source, build artifact, installed copy, DSH ref, scdp version, configuration, command, result, and assessor.
- Record Node, pnpm, TypeScript, bundler, Host module format, Client factory format, and peer dependency resolution used by the evidence.
- Separate structural/source checks from runtime behavior, model-visible transcript evidence, controlled evaluation, and release proof.
- Preserve `UNKNOWN` for missing, stale, interrupted, sandbox-blocked, leaked, or identity-ambiguous evidence.
- Do not claim cross-Harness parity, causal efficacy, token savings, or broad trigger accuracy without a dedicated accepted evaluation.
