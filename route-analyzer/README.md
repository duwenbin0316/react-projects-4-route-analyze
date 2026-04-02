# route-analyzer

Static route and navigation analyzer for React Router v3/v5 sample projects.

## Commands

```bash
npm install
node ./bin/route-analyzer.js analyze ../react-router5-config-array
node ./bin/route-analyzer.js routes ../react-router3-legacy
node ./bin/route-analyzer.js unresolved ../react-router5-demo
node ./bin/route-analyzer.js impact ../react-router3-legacy --target "/trade/detail/:id"
```

## Current Scope

- project detection for single-app and basic monorepo setups
- route extraction for JSX `Route`, `IndexRoute`, config arrays, and v3 `getChildRoutes`
- navigation extraction for `Link`, `NavLink`, `Redirect`, `history.push`, `history.replace`
- custom navigator matching from `route-analyzer.json`
- impact analysis from route path or component file

LLM completion and shared-lib preanalysis are not implemented yet.
