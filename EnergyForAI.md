PROJECT NAME: EnergyForAI

META-INSTRUCTIONS:

<Read it all before acting. Ask about anything unclear, contradictory or
 underspecified — before starting and mid-build. Ask in the question widget
 (AskUserQuestion): related questions batched, concrete options, your
 recommendation first. Plain text only if the widget isn't available.>

<Don't expand scope. Anything not listed here is a proposal, including changes
 to this file — propose it, don't do it.>

<Prefer doing over describing: run the code, write the files, test it.>

<Always in scope, no proposal needed: when it goes on GitHub, a README that is
 easy to read at a glance — a line on what it is, then clear visuals
 (screenshots, a diagram or a chart), then links. Everything else goes in
 linked files: docs/INSTRUCTIONS.md (setup, run, use),
 docs/SYSTEM-DESIGN.md (see below) and docs/FILE-STRUCTURE.md (what's where). If what you're
 building is an application rather than a script, also a small unobtrusive feedback tab, and a settings
 button or tab (⌘, on the Mac) that gathers its preferences in one place.>

<If what you're building is an application, build it as a Mac app first; the
 website comes after, as its own step.>

<Name things the way a person would say them — "Goal Tracker", not
 goal_tracker — for the app, its windows, titles, files people open, repo
 descriptions and README headings. When you create the GitHub repo, name it
 with no "_" or "-": one word or joined words, e.g. GoalTracker.>

<Always in scope: a system design doc in the codebase, docs/SYSTEM-DESIGN.md,
 kept current as the build changes. Cover the architecture (with a Mermaid
 diagram), each component's job, the main flows, where data lives, the key
 design decisions and their trade-offs, how it's tested, and known limits.>

<Finish by listing every deliverable: path, what it is, how to check it works.>

<Git rules (no Claude attribution, never commit .claude/) are in
 ~/.claude/CLAUDE.md and apply on their own — nothing to repeat here.>

<Keep the changelog at the bottom current.>

CONTEXT:

figure out energy for AI. where to get power from

DELIVERABLES:

wesbite

OPEN QUESTIONS / ASSUMPTIONS:

<Agent fills in: what it guessed, what it decided without asking.>

Asked and answered (2026-10-07):
- What it is: an interactive explorer that ranks power options, not a static report.
- Audience: data center developers ("I need X MW by year Y, where do I get it?").
- Website only, no Mac app first: the deliverable says website, and the user confirmed.
- Publish: local, a GitHub repo (EnergyForAI) and GitHub Pages.

Decided without asking:
- US only, with 10 regions (ERCOT, PJM, MISO, SPP, CAISO, Southeast, Desert Southwest, Pacific Northwest, NYISO, ISO-NE).
- 11 options: grid; on-site gas combined cycle; gas engines and aero turbines; fuel cells; solar + batteries; wind + batteries; renewables + gas firming; existing nuclear; SMRs; next-gen geothermal; existing hydro.
- Four criteria: cost, carbon, speed to power, reliability. Scoring is a transparent weighted heuristic; the full method is in docs/SYSTEM-DESIGN.md.
- Plain HTML, CSS and JS with no framework, so GitHub Pages serves it directly.
- Feedback tab: opens a pre-filled GitHub issue, since there's no backend.
- Settings: theme, units and remember-inputs, opened with the gear or ⌘,.
- Some figures are derived or vendor-claimed where nothing public exists (fuel cell cost, hydro PPA price, engine cost); they're marked DERIVED in data/research.json and listed in known limits.

CHANGELOG:

- 2026-10-07 — created
- 2026-10-07 — built v1: interactive Energy for AI explorer website (47 sources, 11 options, 10 regions), tests, docs; published to GitHub and GitHub Pages
- 2026-09-15 — added meta-instruction: built-out applications include a small feedback tab
- 2026-09-15 — added meta-instruction: no "Claude" attribution in commits, PRs, or branches
- 2026-09-16 — added meta-instruction: always include a README when adding to GitHub
- 2026-09-16 — changed meta-instruction: ask clarifying questions in the question widget
- 2026-09-17 — added meta-instructions: Claude never a contributor; never commit .claude/
- 2026-09-26 — compressed the meta-instructions and every field prompt; git rules moved to the global instruction file
- 2026-09-27 — added meta-instruction: applications are built as a Mac app first, then a website
- 2026-09-28 — folded inputs, instructions, constraints, deliverables and done criteria into one free-form CONTEXT
- 2026-09-28 — changed meta-instruction: a README on GitHub always includes a visual
- 2026-09-28 — added meta-instruction: name things like a person would, never snake_case
- 2026-09-28 — changed meta-instruction: README leads with visuals; instructions live in a linked guide
- 2026-09-28 — changed meta-instruction: README is visuals and links; details in docs/INSTRUCTIONS.md and docs/FILE-STRUCTURE.md
- 2026-09-29 — changed meta-instruction: GitHub repo names have no "_" or "-"
- 2026-10-02 — added a DELIVERABLES field after CONTEXT
- 2026-10-02 — added meta-instruction: every project has a system design doc at docs/SYSTEM-DESIGN.md
- 2026-10-05 — added meta-instruction: applications include a settings button or tab
