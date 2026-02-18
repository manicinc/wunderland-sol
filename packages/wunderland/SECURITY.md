## Security Policy

### Supported versions

This repository is developed in the open, but **we do not support storing or using real secrets in the git tree** for any version.

All credentials (API keys, OAuth client secrets, database passwords, etc.) **must live outside the repository**, typically as:

- Environment variables
- Secret manager values (e.g. 1Password, AWS Secrets Manager, Doppler, Vault)
- GitHub Actions / CI secrets

### How we protect this repo

- **GitHub Secret Scanning & Push Protection**  
  This repository is protected by GitHub secret scanning and push protection for common providers (GitHub, AWS, Google, etc.).

- **Local secret scan on commit (free, repo-local)**  
  A small, free scanner lives in `scripts/scanSecrets.mjs`.  
  It checks staged changes for common secret patterns, including:

  - Google API keys and OAuth credentials
  - Database URLs with inline passwords (Postgres, Redis, etc.)
  - AWS access keys and secret keys
  - Private key blocks
  - Generic `API_KEY`, `CLIENT_SECRET`, and similar patterns

### Enabling pre-commit secret checks

On this machine, we install a **git pre-commit hook** that runs the secret scanner before every commit.

1. Ensure you have Node.js installed (see `package.json` engines).
2. Create/update the pre-commit hook **at the repo root**:

   ```sh
   cat > .git/hooks/pre-commit << 'EOF'
   #!/usr/bin/env sh
   # Basic secret scan pre-commit hook for this repo and its workspaces/subrepos
   node scripts/scanSecrets.mjs 2>/dev/null || node ../scripts/scanSecrets.mjs
   RESULT=$?
   if [ "$RESULT" -ne 0 ]; then
     echo ""
     echo "[pre-commit] Secret scan failed. Commit aborted."
     exit "$RESULT"
   fi
   exit 0
   EOF
   chmod +x .git/hooks/pre-commit
   ```

3. (Optional) For checked-in subrepos (git submodules), repeat the same hook inside each submodule:

   ```sh
   cd apps/agentos.sh          # or any submodule path
   cat > .git/hooks/pre-commit << 'EOF'
   #!/usr/bin/env sh
   node scripts/scanSecrets.mjs 2>/dev/null || node ../scripts/scanSecrets.mjs
   RESULT=$?
   if [ "$RESULT" -ne 0 ]; then
     echo ""
     echo "[pre-commit] Secret scan failed. Commit aborted."
     exit "$RESULT"
   fi
   exit 0
   EOF
   chmod +x .git/hooks/pre-commit
   cd -
   ```

This gives you **free local protection** across the main repo and any subrepos/modules where you install the hook.

### If you accidentally commit a secret

1. **Revoke/rotate the secret immediately** in the upstream provider (database, Google Cloud, AWS, etc.).
2. **Open a short PR** that:
   - Removes the secret from the working tree (replace with an environment-variable reference or placeholder).
   - Updates docs/tests to use obviously fake placeholder values.
3. If the secret made it to the default branch or a public fork, perform a **history rewrite** (e.g. `git filter-repo`) and force-push, then:
   - Ask all collaborators to re-clone.
   - Re-run GitHub secret scanning until it reports no findings.

### Reporting a vulnerability

If you believe you have found a security issue in this codebase:

- Do **not** open a public GitHub issue with sensitive details.
- Email the maintainers or use the private contact channel listed in the repository description.
- Provide as much detail as you can to reproduce the issue securely.


