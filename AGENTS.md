# Repository Guidelines

## Project Structure & Module Organization

This repository is a workspace for multiple React sample projects used to validate route extraction and navigation analysis. Keep each sample app in a top-level folder, for example `react-router5-demo/`.

- Root files: repository docs such as [`README.md`](README.md) and `React路由跳转关系分析工具-技术设计文档.md`
- App source: `react-router5-demo/src`
- Page modules: `react-router5-demo/src/pages/<route>/index.jsx`
- Shared route config: `react-router5-demo/src/config/sections.js`
- Static assets: `react-router5-demo/public` and `react-router5-demo/src/assets`

When adding a new sample app, place it at the repository root and give it a descriptive name such as `react-router5-lazy` or `react-monorepo-host-subapps`.

## Build, Test, and Development Commands

Run commands inside the target app directory.

- `cd react-router5-demo && npm install`: install dependencies
- `cd react-router5-demo && npm run dev`: start the Vite dev server
- `cd react-router5-demo && npm run build`: create a production build
- `cd react-router5-demo && npm run lint`: run ESLint
- `cd react-router5-demo && npm run preview`: preview the production build locally

## Coding Style & Naming Conventions

Use ES modules, React function components, and 2-space indentation in JSX/JS files. Prefer ASCII unless a file already contains Chinese text. Keep route pages isolated under `src/pages`, and centralize reusable route metadata in `src/config`.

- Components: `PascalCase`
- Helpers/config files: `camelCase` or descriptive lowercase names
- Route folders: match route intent, e.g. `pages/dashboard`, `pages/profile`

Linting is managed by ESLint via `eslint.config.js`. Run lint before committing.

## Testing Guidelines

There is no automated test suite yet. For now, treat `npm run lint` and `npm run build` as the minimum verification step for each changed app. When adding future tests, keep them near the app they validate and use names like `*.test.jsx` or `*.spec.jsx`.

## Commit & Pull Request Guidelines

Follow the existing Conventional Commit style:

- `chore: initialize route analysis sample projects`
- `feat: add react-router5 config-array sample`

Keep commits scoped to one sample app or one repository-level concern. PRs should include:

- what sample or route pattern was added or changed
- why the change matters for route-analysis coverage
- screenshots only when UI structure changed materially
