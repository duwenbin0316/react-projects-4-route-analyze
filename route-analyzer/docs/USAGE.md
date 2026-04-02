# Route Analyzer Usage

## Install

```bash
cd route-analyzer
npm install
```

## Basic Commands

Analyze a project and print the full result:

```bash
node ./bin/route-analyzer.js analyze ../react-router5-config-array
```

Extract only routes:

```bash
node ./bin/route-analyzer.js routes ../react-router3-legacy
```

List unresolved items:

```bash
node ./bin/route-analyzer.js unresolved ../react-router5-demo
```

Generate an impact report:

```bash
node ./bin/route-analyzer.js impact ../react-router3-legacy --target "/trade/detail/:id"
```

Write output to a file:

```bash
node ./bin/route-analyzer.js analyze ../react-monorepo-host-subapps -o ./result.json
```

## Config File

If the target project contains `route-analyzer.json`, the CLI will load it automatically. You can also pass a custom path:

```bash
node ./bin/route-analyzer.js analyze ../some-app --config ./route-analyzer.json
```

Supported config areas:

- `apps`: manually declare apps, route entry files, and router version
- `customNavigators`: manually register wrapped navigation functions/components
- `aliases`: declare import aliases such as `@`, `@pages`, or workspace-local mappings
- `mounts`: host-to-subapp mount prefixes for monorepo route composition

## Current Capabilities

- React Router v3 and v5 route extraction
- JSX `Route`, config arrays, `IndexRoute`, `getChildRoutes`
- `Link`, `NavLink`, `Redirect`, `history.push`, `history.replace`
- `useNavigate`, `window.location.href`, and v3 `onEnter` replace detection
- alias resolution for relative imports, config aliases, basic tsconfig paths, basic webpack aliases, and workspace package names
- shared-lib preanalysis for simple wrapped navigation functions

## Known Gaps

- no LLM unresolved completion yet
- no deep inter-procedural data-flow tracing
- webpack alias parsing only supports simple literal config
- complex shared-lib wrappers may still require manual `customNavigators`
