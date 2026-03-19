# Automatic Linting Setup

Date: March 19, 2026

## Goal

Keep linting setup simple and automatic for cloud push/PR flow.

## Final setup

1. One main lint command in `package.json`:

```bash
npm run lint
```

This runs both:

- `npm run lint:frontend` (StandardJS on `Frontend/**/*.{js,jsx}`)
- `npm run lint:backend` (ESLint on `Backend/**/*.js`)

2. CI workflow in `.github/workflows/lint.yml` runs:

```bash
npm ci
npm run lint
```

3. Backend ESLint config in `.eslintrc.cjs` uses `eslint:recommended` with practical rules for current backend style.

## Team usage

Run before push:

```bash
npm run lint
```

Optional quick fix for frontend style:

```bash
npm run lint:fix
```

If GitHub Actions lint fails, run `npm run lint`, fix issues, and push again.
