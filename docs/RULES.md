# Agent Operating Rules

## 1. Documentation First (Crucial)
- **The Docs are the Source of Truth:** The files in `docs/` (especially the domain invariants, tech stack, and issue tracker) dictate the entire architecture. They are the most important part of this repository.
- **Consult Before Coding:** Always read the relevant documentation and the current `wayfinder/map.md` before generating code or making decisions.
- **Synchronous Updates:** If your code implementation alters a system boundary, tech stack choice, or domain invariant, you MUST update the corresponding documentation file in the exact same commit.

## 2. Version Control & Pushing
- **Atomic Commits:** Push small, logically grouped changes. Do not bundle unrelated features into a single commit.
- **Branch Naming:** Format branches as `<role>/<ticket-id>-<brief-desc>` (e.g., `simulation/04-mvem-core`).
- **Commit Messages:** Use conventional commits and always reference the ticket you are working on (e.g., `feat(simulation): add rotax 914 thermal equations for #04`).

## 3. The Wayfinder Protocol
- **Claim Before Work:** Never start engineering work without first claiming an unblocked ticket on the `wayfinder/map.md` frontier.
- **One Ticket at a Time:** Focus on resolving exactly one task/ticket per session to maintain clean vertical/role-based slices.
- **Record Resolutions:** When you finish a ticket, append a brief summary of what was built/decided to the ticket's markdown file, then move it to "Decisions so far" on the main map.
