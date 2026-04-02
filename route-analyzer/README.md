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

Detailed usage guide:

- [`docs/USAGE.md`](/Users/duwenbin/Code/react-project-demo/route-analyzer/docs/USAGE.md)

## Current Scope

- project detection for single-app and basic monorepo setups
- alias resolution for relative imports, `route-analyzer.json` aliases, basic tsconfig/jsconfig paths, basic webpack aliases, and workspace package names
- route extraction for JSX `Route`, `IndexRoute`, config arrays, and v3 `getChildRoutes`
- navigation extraction for `Link`, `NavLink`, `Redirect`, `history.push`, `history.replace`, `useNavigate`, `window.location.href`, and v3 `onEnter` replace
- custom navigator matching from `route-analyzer.json`
- shared-lib preanalysis for simple exported wrapped navigation functions
- impact analysis from route path or component file
- `unresolvedImports` reporting for alias/import paths that could not be mapped to real files

LLM completion and shared-lib preanalysis are not implemented yet.
