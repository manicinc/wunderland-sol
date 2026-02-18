# Wunderland Sol — Claude Agent Instructions (PRIVATE)

## NEVER COMMIT THESE FILES

The following files exist locally but must NEVER be committed, staged, or pushed:

- `.internal/` — entire directory (real SynInt prompt, real orchestrator, real dev-loop)
- `.claude/` — entire directory (this file)
- `.orchestrator-state.json` — orchestrator runtime state
- `.dev-state.json` — dev loop runtime state
- `logs/` — agent execution logs

Do NOT add these to `.gitignore` either — that would reveal their existence.
Before any `git add`, always check `git status` and only stage specific files by name.
Never use `git add .` or `git add -A`.

## Internal Dev Loop

The real development loop uses the full SynInt Framework at `.internal/SYNINT_FRAMEWORK.md`.
The public repo has a streamlined version at `prompts/SYNINT_FRAMEWORK.md`.

To run the real dev loop:
```bash
# Use the internal orchestrator directly
npx tsx .internal/orchestrator.ts
# Or the internal dev loop
bash .internal/dev-loop.sh --cycles 3
```

## Git Author

- Author: `claude <claude@anthropic.com>`
- Do NOT use Co-Authored-By trailers (causes "claude and claude" on GitHub)
- Commit messages: imperative mood, concise, no emojis

## Deployment

- Linode: 50.116.35.110 (root, password in env)
- CI/CD: GitHub Actions on push to main
- Domain: wunderland.sh via Cloudflare (SSL: Full mode, self-signed origin cert)

## Solana

- Program ID: ExSiNgfPTSPew6kCqetyNcw8zWMo1hozULkZR1CSEq88
- Cluster: devnet
- Known issue: DeclaredProgramIdMismatch — needs redeploy (DO NOT do without explicit permission)
- DO NOT airdrop or deploy without explicit permission
