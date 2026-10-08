# CLAUDE.md

@AGENTS.md

Claude-specific notes (everything else is in `AGENTS.md`):

- Reply in Spanish; code and commits in English.
- Analysis and proposal before any change that was not explicitly requested;
  commit only when asked, as `vX.Y.Z, description` on one line.
- Run `pnpm check` before declaring anything done, and close with a short
  Spanish summary of what changed and what was verified.
- Do not re-read files already read in the session; do not reach for a new
  dependency when `app/lib` or `app/ui` already covers the need.
