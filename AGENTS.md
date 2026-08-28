# work-charter-dsh project instructions

This repository owns the external DSH Work Charter policy plugin. It is independently versioned and releasable from `session-coordinator-dsh`, the Codex Work Charter Skill, and the DSH upstream checkout.

## Read order and canonical owners

1. [README.md](README.md) — human entry point and stable summary.
2. [docs/SPEC.md](docs/SPEC.md) — canonical product scope, invariants, interfaces, and acceptance contract.
3. [docs/STATUS.md](docs/STATUS.md) — canonical current state, dependency gate, writer, next action, and recovery entry.
4. [docs/VERIFICATION.md](docs/VERIFICATION.md) — canonical verification method, evidence identities, and limitations.

| Durable fact | Canonical write owner |
|---|---|
| Product purpose, Work Charter semantics, boundaries, acceptance | `docs/SPEC.md` |
| Current phase, dependency, blockers, writer, recovery | `docs/STATUS.md` |
| Commands, evaluations, results, provenance and evidence limits | `docs/VERIFICATION.md` |
| Package version, once a package exists | `package.json` |
| Human navigation and stable synopsis | `README.md` |

Do not duplicate mutable status, evidence, or version facts in parent-directory documents. Add an ADR only for an accepted material decision needing durable rationale.

## Working rules

- Implement as an external DSH bundle with Host and Client halves in this repository.
- Use TypeScript as the production source language with `strict` and `noImplicitAny`. Emit a Node ESM Host entry and DSH's required lazy-CJS browser factory entry; the special Client artifact does not authorize a general CommonJS package surface.
- Match the pinned DSH Node engine and package/runtime contract. Keep scdp, `@deepseek-ai/cordis`, consumed DSH Service Definitions, and shared UI runtime such as React as peer dependencies plus development dependencies so the profile loads one runtime identity.
- Do not implement the v1 plugin in Python. Plain JavaScript ESM is acceptable only for a bounded loading probe, not for the policy engine or release candidate.
- Consume the public `session-coordinator-dsh` Service Definition; do not import or modify its implementation internals.
- Keep Work Charter concepts distinct from DSH goal, plan, workflow, subagent, approval, Session lineage, and Trajectory concepts.
- Host-side code owns authoritative policy state and transition checks. Browser blocks, badges, and prompts are presentation or affordances, not enforcement.
- Anything model-visible must be reconstructable from the DSH Session log.
- Keep three identities distinct during development and evaluation: stable external governance, the bound upstream Work Charter baseline, and the DSH candidate plugin.
- The candidate must not govern, approve, accept, or evaluate itself. Do not leak external governance instructions into baseline/candidate model context.
- Keep one repository writer at a time; preserve unrelated dirty work and pin the exact scdp and DSH versions used by evidence.

## Documentation and recovery

- Update the canonical owner in the same change when its durable fact changes.
- Resume from `docs/STATUS.md`, then revalidate Git state, writer, baseline identity, scdp dependency, DSH ref, and the last evidence checkpoint.
- Ask before splitting, merging, renaming, migrating, or changing a canonical owner. If routing is broken, explicitly invoke `manage-project-docs`.
- Stop before writing when permission, scope, writer, repository identity, dependency contract, evaluation isolation, or evidence is unresolved.
- Git initialization, commits, pushes, pull requests, installation, publication, and upstream changes require separate authorization.
