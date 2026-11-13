## Repository Navigation & Deterministic Discovery

To minimize unnecessary token consumption, EVERY new conversation or task must follow this strict discovery order:

1. **Read Project State First:**
   Read `docs/PROJECT_STATUS.md` and the latest entry in `docs/DEVELOPMENT_LOG.md`.
   Identify the active phase, current task, and relevant files in under 800 tokens.
   Do NOT read `PROJECT_SPECIFICATION.md` or full architecture documents unless specifically required for an architectural decision.

2. **Consult Graphify Before Source Exploration:**
   Do NOT run `find`, `grep -r`, or broad directory dumps.
   Use the Graphify CLI (`/home/mihawk/.local/bin/graphify`) to pinpoint exact symbols, files, and caller/callee relationships:
   - Symbol & Dependency Query: `graphify explain "<SymbolName>"`
   - Path Between Components: `graphify path "<SourceFile>" "<TargetFile>"`
   - Architectural Map: Inspect `graphify-out/obsidian/Index.md` or module notes in `graphify-out/obsidian/`.

3. **Graph Lifecycle & Updates:**
   - Incremental update (after adding/editing files): `graphify update .`
   - Export Obsidian markdown notes: `graphify export obsidian --dir graphify-out/obsidian`
   - Regenerate the graph ONLY when:
     - The graph is demonstrably stale (>5 new source files created).
     - `graphify-out/manifest.json` is missing or invalid.
   - Do NOT run full extraction for minor edits within an existing, known file.

4. **Surgical Source Inspection:**
   Inspect ONLY the target files and specific line ranges needed for the current task.
   Use Git status (`git status -s`) and Git diff (`git diff --stat`) to inspect recent changes.

## Git and GitHub Workflow

After completing each approved implementation milestone:

1. Inspect changes using `git status` and `git diff`.
2. Run relevant tests locally (`pytest`, `npm run build`, `npm run lint`).
3. Check for secrets, credentials, `.env` files, and temporary caches.
4. Stage ONLY relevant files using explicit `git add <file>` commands (never blind `git add .`).
5. Create descriptive conventional commits:
   - `feat:` new functionality
   - `fix:` bug fixes
   - `docs:` documentation
   - `test:` tests
   - `refactor:` code restructuring
   - `infra:` Terraform and infrastructure
   - `ci:` CI/CD changes
   - `chore:` maintenance and tooling
6. Push successful commits to GitHub (verifying remote configuration first).

Rules:
- Never force-push (`--force`).
- Never commit secrets or API keys.
- Never claim a push succeeded without explicit terminal confirmation.
- If GitHub authentication or remote configuration is missing, report it immediately.