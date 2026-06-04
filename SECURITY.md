# Security

## Reporting a vulnerability

Please report suspected vulnerabilities privately (e.g. GitHub Security
Advisories or security@your-domain) rather than opening a public issue. Expect
an acknowledgement within a few business days.

## Dependency scanning

Two layers, both automated:

1. **CI gate (`security` job in `.github/workflows/ci.yml`).** On every push and
   PR, `npm audit` runs for the frontend and the backend.
   - **Frontend** blocks the build on **critical** advisories (the large dev
     toolchain often carries unfixable transitive `high`s; those are reported,
     not gated).
   - **Backend** blocks on **high** and above — the runtime dep set (Fastify,
     postgres, ioredis, zod, web-push) is small and controllable.
   - Lower-severity findings are printed for visibility (`|| true`) without
     failing CI.

2. **Dependabot (`.github/dependabot.yml`).** Weekly update PRs for the frontend
   npm deps, the backend npm deps, and the GitHub Actions used in CI. Updates are
   grouped (Angular, PrimeNG, dev minor/patch, backend prod/dev) to limit PR
   noise. Each PR runs through the full CI, including the audit gate, before it
   can merge.

> Renovate is a drop-in alternative to Dependabot with finer scheduling/grouping
> if richer policy is ever needed; the CI audit gate is independent of which one
> is used.

## Operational notes

- Commit `package-lock.json` for both the root and `/server` so audits and
  Dependabot resolve a deterministic tree. The CI audit step uses
  `npm install --package-lock-only` so it works even before a lockfile is
  committed, but committed lockfiles are strongly recommended.
- Run `npm audit fix` locally to apply safe upgrades; review the diff before
  committing.
- Application-level hardening (security headers, CSP, per-identity rate limiting,
  session rotation, GDPR export/delete) is documented in `DEPLOYING.md` and the
  server module comments.
