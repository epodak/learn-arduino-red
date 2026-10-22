# AGENTS.md - Project Operating Rules & Invariants

> Single Source of Truth: All cross-agent collaborative guidelines follow C:\Users\root\AGENTS.md.

## Non-negotiable rules

1. **Invariants outrank aesthetic or creative freedom.**
   Backward compatibility, API contracts, zero-breaking-change guarantees, and architectural invariants strictly outrank "looks cleaner".

2. **Configuration hygiene (Agent Relay Hygiene).**
   - Sensitive credentials belong strictly in local private `.env` only (never committed).
   - `.env.example` is the 100% desensitized shadow mirror of `.env` (1:1 key parity).
   - Non-sensitive decoupling configs belong in `config.toml` (committed to repo).

3. **Node.js package manager invariant (pnpm only).**
   - Strictly use `pnpm` for all package management and script execution (`pnpm install`, `pnpm run dev`, `pnpm build`, `pnpm test`).
   - Using `npm` or `yarn` is strictly prohibited. Never commit `package-lock.json` or `yarn.lock`.

4. **Evaluation closes the loop.**
   A task recipe without an objective evaluation criterion (test assertion, exit code, typecheck) is incomplete. Execution stops only when acceptance gates pass.

5. **Documentation hygiene (Docs Gardener Invariant).**
   - Strictly follow docs/README.md and Docs Gardener v3.0 protocol.
   - Top-level directories in docs/ must remain standard English (architecture/, engineering/, decisions/, strategy/, workflow/, archive/).
   - Specific document files must use semantic Chinese names without numbering prefixes (e.g., no 00-, 01-, ADR-001).
   - Single source of truth: decisions store "Why" with 6-field ADRs, engineering stores "How", architecture stores "What". Never create stray markdown files in docs/ root.

6. **Available native CLI via exec_command (Zero-Relay Autonomy Contract).**
   When operating via MCP, the execution environment is trusted with full environment variables inherited.
   The agent MUST directly call `exec_command` to execute commands rather than printing instructions for human relay:
   - `cf-access`: Cloudflare Zero Trust gate management (`cf-access list`, `cf-access add <app> <email>`).
   - `pnpm exec wrangler`: Cloudflare edge operations (`d1`, `r2`, `deploy`).
   - `pnpm` / `git`: Standard package and repository operations.
   - `msearch` / `ss`: Fast workspace and local service tools.

7. **Skills library registry.**
   Always inspect available skills at `C:/Users/root/.gemini/config/skills/<skill-name>/SKILL.md` or `.agents/skills/` before guessing implementations.
