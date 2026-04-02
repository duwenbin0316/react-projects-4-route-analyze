# Repository Guidelines

## Project Structure & Module Organization

This repository is a workspace for multiple React sample projects used to validate route extraction and navigation analysis. Keep each sample app in a top-level folder, for example `react-router5-demo/` or `react-router3-legacy/`.

- Root files: repository docs such as [`README.md`](README.md) and `React路由跳转关系分析工具-技术设计文档.md`
- Analyzer package: `route-analyzer/` contains the CLI and core scanning logic
- Tool usage doc: `route-analyzer/docs/USAGE.md`
- App source: `react-router5-demo/src`
- Page modules: `react-router5-demo/src/pages/<route>/index.jsx`
- Shared route config: `react-router5-demo/src/config/sections.js`
- Static assets: `react-router5-demo/public` and `react-router5-demo/src/assets`
- Legacy webpack sample: `react-router3-legacy/src`, `react-router3-legacy/public`, `react-router3-legacy/webpack.config.js`

When adding a new sample app, place it at the repository root and give it a descriptive name such as `react-router5-lazy` or `react-monorepo-host-subapps`.

## Build, Test, and Development Commands

Run commands inside the target app directory.

- `cd react-router5-demo && npm install`: install dependencies
- `cd react-router5-demo && npm run dev`: start the Vite dev server
- `cd react-router5-demo && npm run build`: create a production build
- `cd react-router5-demo && npm run lint`: run ESLint
- `cd react-router5-demo && npm run preview`: preview the production build locally
- `cd route-analyzer && npm install`: install analyzer dependencies
- `cd route-analyzer && node ./bin/route-analyzer.js analyze ../react-router5-config-array`: run the scanner against a sample app
- `cd route-analyzer && node ./bin/route-analyzer.js impact ../react-router3-legacy --target "/trade/detail/:id"`: generate an impact report
- `cd react-router3-legacy && npm install`: install legacy webpack dependencies
- `cd react-router3-legacy && npm run start`: run the webpack dev server
- `cd react-router3-legacy && npm run build`: build the legacy webpack sample

## Coding Style & Naming Conventions

Use ES modules, React function components, and 2-space indentation in JSX/JS files for Vite-based samples. Prefer ASCII unless a file already contains Chinese text. Keep route pages isolated under `src/pages`, and centralize reusable route metadata in `src/config`.

- Components: `PascalCase`
- Helpers/config files: `camelCase` or descriptive lowercase names
- Route folders: match route intent, e.g. `pages/dashboard`, `pages/profile`
- Legacy webpack/v3 samples may intentionally keep older patterns such as class components, `contextTypes`, and route config objects if they improve analysis coverage
- Keep scanner logic under `route-analyzer/src/core` and keep CLI/file I/O glue under `route-analyzer/src/cli`
- Keep user-facing command examples in `route-analyzer/docs/USAGE.md` updated when CLI behavior changes

Linting is managed by ESLint via `eslint.config.js` in Vite samples. Some legacy samples may omit linting if the goal is to preserve authentic old-project structure.

## Testing Guidelines

There is no repository-wide automated test suite yet. For Vite samples, treat `npm run lint` and `npm run build` as the minimum verification step. For legacy webpack samples, run `npm run build` at minimum. When adding future tests, keep them near the app they validate and use names like `*.test.jsx` or `*.spec.jsx`.

## Commit & Pull Request Guidelines

Follow the existing Conventional Commit style:

- `chore: initialize route analysis sample projects`
- `feat: add react-router5 config-array sample`
- `feat: convert react-router3 sample to webpack`

Keep commits scoped to one sample app or one repository-level concern. PRs should include:

- what sample or route pattern was added or changed
- why the change matters for route-analysis coverage
- screenshots only when UI structure changed materially
