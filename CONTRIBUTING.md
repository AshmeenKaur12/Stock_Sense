# Contributing to StockSense

Guidelines for anyone working on this project.

## Getting started

```bash
git clone https://github.com/AshmeenKaur12/Stock_Sense.git
cd Stock_Sense
npm install
npm run dev:local   # starts the local DB + API + client together
npm run seed        # fills the database with demo data
```

See the main [README](./README.md) for full environment setup, seed logins and API details.

## Before opening a pull request / pushing changes

Run these from the repo root — all must pass:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Branch & commit conventions

- Branch names: `feature/short-description`, `fix/short-description`
- Commit messages: short imperative summary on the first line (e.g. `Fix stock validation on delivery form`), with more detail in the body if needed
- Keep commits focused — one logical change per commit rather than one giant commit for many unrelated changes

## Project structure

See the **Architecture** section in [README.md](./README.md) for the folder layout, and [docs/DESIGN.md](./docs/DESIGN.md) / [docs/MOCKUP.md](./docs/MOCKUP.md) for the UI reference this project follows.

## Reporting issues

Open a GitHub Issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce (which page, which role, which action)
