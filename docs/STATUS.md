# work-charter-dsh status and recovery

Last updated: 2026-08-28

## Current state

- Phase: public-repository placeholder publication and pre-implementation architecture definition.
- Public repository: created at `https://github.com/junwei529/work-charter-dsh` with Public visibility and default branch `main`.
- Local repository: initialized on `main` with `origin` set to `https://github.com/junwei529/work-charter-dsh.git`.
- Public content acceptance: pending the initial commit, push, and independent remote verification.
- Package/source scaffold: not created.
- Implementation, automated tests, runtime installation, evaluation, tag, Release, and upstream contribution: not started.
- Current writer: public transaction `WC-DSH-PUBLICATION-2026-08-28-01`, authorized by repository owner `junwei529`; handoff target is `none` after verified push and evidence recording.

## Confirmed decisions

- The only approved public maturity label is `Planned — not yet developed`.
- The public repository is a minimal truthful placeholder and navigation/status surface, not an implementation or readiness claim.
- No installation instructions, package metadata, compatibility claim, tag, Release, or efficacy claim will be published at this stage.
- No license has been selected; no `LICENSE` file will be added without a separate decision.
- This plugin and scdp are separate repositories with independent SemVer, tags, releases, status, evidence, and writers.
- This plugin owns Work Charter policy semantics; scdp owns Workstream identity and generic cross-Session coordination.
- One external bundle will contain both Host and Client halves if implementation is later authorized.
- A future production implementation uses strict TypeScript, emitting a Node ESM Host entry and DSH lazy-CJS browser factory; plain JavaScript is limited to a bounded loading probe.
- The consumer owns cross-plugin integration tests and pins an exact compatible scdp version.
- Candidate, upstream baseline, external governance, and assessor identities remain separate.
- The candidate cannot govern, approve, accept, or evaluate itself.
- Work Charter state will not be encoded as native DSH goal, plan, workflow, subagent, approval, Session lineage, or Trajectory state.

## Dependency state

- scdp public Service Definition: not implemented and version range `UNKNOWN`.
- Exact `WC-UPSTREAM` source/version/hash: `UNKNOWN`; bind it before semantic mapping or evaluation.
- Exact DSH supported version range: `UNKNOWN`.
- This sequencing blocks implementation integration, but does not block a read-only upstream semantic mapping.

## Open facts and blockers

- `UNKNOWN`: package scope/name, Charter schema fields, command/Remote API, and migration/version policy.
- `UNKNOWN`: exact DSH logged injection mechanism for all desired model-visible Charter sections in an external plugin.
- `UNKNOWN`: whether a dedicated generic browser event seam is necessary after scdp's first query/polling implementation.
- No runtime or efficacy claim exists. The architecture assessment and public placeholder are not product evidence.

## Next safe action

1. Complete the bounded publication transaction: review, initial commit, push, public-page verification, and evidence recording.
2. Relinquish the publication writer after the accepted public state is recorded.
3. In a separately authorized task, bind the stable Work Charter source without modifying it and produce a read-only semantic mapping.
4. Wait for a versioned scdp Service Definition before starting cross-plugin implementation.
5. Stop for separate authorization before dependency installation, implementation writes, later commits or pushes, pull requests, tags, Releases, package publication, evaluation, or upstream modification.

## Recovery read order

Read `AGENTS.md`, `README.md`, `docs/SPEC.md`, this file, and `docs/VERIFICATION.md`. Then compare live Git/writer state, `origin`, remote `main`, the exact upstream Work Charter identity, scdp dependency, DSH ref, and the last evidence checkpoint with this snapshot.

This publication authorization does not authorize implementation, installation, source scaffolding, package publication, tags, Releases, pull requests, DSH or scdp edits, candidate evaluation runs, or other upstream/external effects.
