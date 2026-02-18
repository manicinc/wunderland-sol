# Development Notes

## Package Name Migration

**Note for Production Release:**

The `@framers/agentos` package will be renamed to `@framers/agentos-core` (or `@framers/agentos`) when released to production. This is a planned migration to align with the `@framers` organization namespace on NPM.

**Current state:**
- Development: `@framers/agentos` (workspace package)
- Production: Will be `@framers/agentos-core` or `@framers/agentos`

**Impact:**
- This package (`@framers/sql-storage-adapter`) is already correctly scoped under `@framers`
- No changes needed in this package
- Update any references to `@framers/agentos` when migrating to production


