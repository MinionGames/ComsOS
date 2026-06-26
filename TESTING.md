# Testing and linting

## Frontend

Run the frontend checks from `/frontend`:

- `npm run lint` runs ESLint and strict TypeScript checks.
- `npm run format` applies Prettier formatting.
- `npm test` runs the Jest suite once.
- `npm run test:watch` runs Jest in watch mode.

Installing frontend dependencies with `npm install` also runs the `prepare` script, which installs the repository Husky hook. The hook runs `lint-staged` so staged frontend files are auto-linted and auto-formatted before commit.

## Backend

Run the backend checks from `/backend`:

- `ruff check app tests`
- `flake8 app tests`
- `black --check app tests`
- `pytest`

`backend/.pre-commit-config.yaml` runs Ruff, Black, Flake8, and Pytest. Install it once with `pre-commit install -c backend/.pre-commit-config.yaml`. Python package installs do not safely support automatic Git hook installation, so this one-time command is still required for backend-only workflows.

## Bypassing hooks

Use `git commit --no-verify` to bypass the Git hook when you explicitly need to skip local checks. To skip only selected backend hooks when running `pre-commit` directly, use `SKIP=<hook-id> pre-commit run`.
