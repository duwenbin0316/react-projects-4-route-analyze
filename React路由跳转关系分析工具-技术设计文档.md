# React 路由跳转关系分析工具 — 技术设计文档

## 1. 目标与边界

### 1.1 做什么

给定一个 React 前端项目（含 monorepo），静态分析产出：

- **路由注册表**：项目内所有已声明的路由 path 及其对应组件
- **跳转关系图**：页面/组件之间的跳转关系、跳转方式、传参详情
- **变更影响报告**：给定一个被修改的路由或组件，反向查出所有受影响的跳转来源

### 1.2 不做什么

- 不做运行时动态分析（动态路由走人工补充机制）
- 不做完整数据流分析（变量传参标记 unresolved，不追溯赋值链）
- 不支持 Next.js / Remix 等文件系统路由（聚焦 React Router v3/v5）
- 不做 watch 模式（批量扫描 + CI 集成）

---

## 2. 核心数据模型

### 2.1 路由注册表 RouteEntry

```typescript
interface RouteEntry {
  /** 路由路径，如 /trade/detail/:id */
  path: string;
  /** 对应的组件文件路径（相对项目根目录） */
  componentFile: string;
  /** 组件导出名 */
  componentName: string;
  /** 是否懒加载 */
  lazy: boolean;
  /** 嵌套子路由 */
  children?: RouteEntry[];
  /** 所属应用（monorepo 场景） */
  app?: string;
  /** 路由来源：ast 静态提取 / manual 人工补充 / runtime 运行时抓取 */
  source: 'ast' | 'manual' | 'runtime';
  /** 原始代码位置 */
  loc: SourceLocation;
}
```

### 2.2 跳转关系 NavigationEdge

```typescript
interface NavigationEdge {
  /** 跳转发起方 */
  from: {
    file: string;
    componentName?: string;
    line: number;
  };
  /** 跳转目标 */
  to: {
    /** 字面量路径或路径 pattern */
    path?: string;
    /** 未解析的表达式原文（变量/动态拼接） */
    rawExpression?: string;
  };
  /** 跳转方式 */
  method:
    | 'Link'
    | 'NavLink'
    | 'history.push'
    | 'history.replace'
    | 'useNavigate'
    | 'redirect'
    | string; // 自定义封装方法名
  /** 传递的参数 */
  params: {
    pathParams?: Record<string, ParamValue>;
    query?: Record<string, ParamValue>;
    state?: Record<string, ParamValue>;
    hash?: string;
  };
  /** 解析置信度 */
  confidence: 'high' | 'medium' | 'low';
  /** 解析来源 */
  resolvedBy: 'ast' | 'llm' | 'manual';
}

type ParamValue =
  | { type: 'literal'; value: string | number | boolean }
  | { type: 'template'; template: string; variables: string[] }
  | { type: 'unresolved'; expression: string };
```

### 2.3 应用清单 AppManifest（monorepo）

```typescript
interface AppManifest {
  workspace: string;
  apps: AppEntry[];
  sharedLibs: string[];
}

interface AppEntry {
  name: string;
  root: string;
  routeEntries: string[];
  routerVersion: 'v3' | 'v5' | 'unknown';
  role: 'standalone' | 'host' | 'sub-app';
  /** host 应用挂载子应用的路径映射 */
  mounts?: Record<string, string>;
  /** 自定义跳转方法声明 */
  customNavigators?: CustomNavigator[];
}

interface CustomNavigator {
  /** 方法名，如 jumpTo */
  name: string;
  /** 来源模块，如 @corp/common-utils */
  module: string;
  /** 路径参数在第几个 argument（0-indexed） */
  pathArgIndex: number;
  /** 查询参数在第几个 argument */
  queryArgIndex?: number;
  /** 状态参数在第几个 argument */
  stateArgIndex?: number;
}
```

### 2.4 最终输出 AnalysisResult

```typescript
interface AnalysisResult {
  /** 分析时间 */
  analyzedAt: string;
  /** 项目信息 */
  project: {
    root: string;
    isMonorepo: boolean;
    manifest?: AppManifest;
  };
  /** 所有路由 */
  routes: RouteEntry[];
  /** 所有跳转关系 */
  edges: NavigationEdge[];
  /** 统计摘要 */
  stats: {
    totalRoutes: number;
    totalEdges: number;
    resolvedEdges: number;
    unresolvedEdges: number;
    llmResolvedEdges: number;
    unresolvedImports: number;
  };
}
```

---

## 3. 产品形态：Core Library + CLI + Skill

工具分三层，各服务不同消费者：

```
┌─────────────────────────────────────────────────────────────────┐
│  Skill (SKILL.md)                                               │
│  AI coding agent 的使用说明书                                     │
│  消费者：OpenCode / Claude Code 等 agent                         │
│  职责：告诉 agent 有哪些命令、怎么调、怎么解读输出                    │
├─────────────────────────────────────────────────────────────────┤
│  CLI (commander)                                                │
│  route-analyzer analyze | impact | routes | unresolved          │
│  消费者：CI 流水线 / agent / 开发者手动执行                        │
│  职责：参数解析、文件 IO、退出码、格式化输出                         │
├─────────────────────────────────────────────────────────────────┤
│  Core Library                                                   │
│  analyze() / impact() / extractRoutes()                         │
│  消费者：CLI 层 / 未来可能的 Web 服务 / 测试                      │
│  职责：全部分析逻辑，纯函数输入输出，不涉及文件 IO 和进程控制         │
└─────────────────────────────────────────────────────────────────┘
```

设计原则：
- Core Library 是唯一的逻辑层，CLI 和 Skill 都是它的壳子
- CLI 保证 CI 和独立使用的确定性
- Skill 让 agent 会用 CLI，不包含业务逻辑
- Skill 描述的是 CLI 命令调用，不依赖特定 agent 平台 API，OpenCode / Claude Code 通用

---

## 4. 分析管道

```
┌────────────────────────────────────────────────────────────────────────┐
│                     CLI / Core Library 入口                             │
│   route-analyzer analyze ./project --config route-analyzer.json       │
└──────────────┬─────────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────┐
│  阶段一：项目探测          │  纯 Node.js
│  输出 AppManifest         │  读 package.json / workspace 配置
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  阶段二：Shared Lib 预分析 │  AST 分析共享库中的封装方法
│  输出 CustomNavigator[]   │  产出跳转方法签名
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  阶段三：AST 确定性提取    │  对每个 app 并行跑 extractor
│  输出 RouteEntry[]        │  resolved edges + unresolved edges
│       NavigationEdge[]    │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  阶段四：LLM 批量补全      │  将 unresolved edges 分批发给模型
│  输出 NavigationEdge[]    │  受限推断，从已知路由表中匹配
│  (confidence: medium)     │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  阶段五：合并 + 输出       │  merge 人工补充
│  输出 AnalysisResult JSON │  拼接 monorepo 路由前缀
│                           │  生成变更影响报告
└───────────────────────────┘
```

---

## 5. 阶段一：项目探测

### 5.1 Monorepo 检测逻辑

```
1. 检查根目录是否存在：
   - pnpm-workspace.yaml → 读 packages 字段
   - lerna.json → 读 packages 字段
   - 根 package.json 的 workspaces 字段
2. 如果都没有 → 单应用模式，apps = [当前目录]
3. 如果是 monorepo → glob 展开所有 package 目录
```

### 5.2 每个 Package 的探测

```
对每个 package：
1. 读 package.json，检查 dependencies / devDependencies
   - 有 react-router / react-router-dom → 标记为含路由的 app
   - 判断版本号 → 标记 routerVersion (v3: ^3.x, v5: ^5.x)
2. 查找路由入口文件（按优先级）：
   - 配置文件显式指定的
   - src/router/index.{tsx,jsx,ts,js}
   - src/routes.{tsx,jsx,ts,js}
   - src/App.{tsx,jsx,ts,js} 中 import 了 Route 的
3. 判断 role：
   - 如果 dependencies 中包含其他 workspace package 且那些 package 有路由 → host
   - 如果被其他 package 引用 → sub-app
   - 否则 → standalone
4. 识别 sharedLibs：
   - 被多个 app 引用的 workspace package
   - 不含路由但导出了函数/组件的
```

### 5.3 配置文件 route-analyzer.json

用户可以手动提供或覆盖探测结果：

```json
{
  "apps": [
    {
      "name": "trade-app",
      "root": "packages/trade",
      "routeEntries": ["src/router/index.tsx"],
      "routerVersion": "v5",
      "customNavigators": [
        {
          "name": "jumpTo",
          "module": "@corp/common-utils",
          "pathArgIndex": 0,
          "queryArgIndex": 1
        },
        {
          "name": "CorpLink",
          "module": "@corp/ui-components",
          "pathArgIndex": 0
        }
      ]
    }
  ],
  "aliases": {
    "@": "./src",
    "@pages": "./src/pages",
    "@utils": "./src/utils",
    "~": "./src",
    "@corp/common-utils": "../common-utils/src"
  },
  "dynamicRoutes": "supplements/dynamic-routes.json",
  "llm": {
    "provider": "minimax",
    "model": "minimax-2.5",
    "baseUrl": "https://your-internal-api-gateway/v1",
    "batchSize": 20,
    "enabled": true
  }
}
```

---

## 6. 阶段二：Shared Lib 预分析

### 6.1 目标

分析 `sharedLibs` 中封装的跳转方法，自动生成 `CustomNavigator` 配置。

### 6.2 分析策略

对共享库的导出函数/组件，做浅层 AST 分析：

```
对每个导出的函数/组件：
1. 检查函数体内是否调用了 history.push / history.replace / useNavigate 等
2. 如果是 → 追溯哪个参数被传给了这些 API 的第一个参数
3. 输出 CustomNavigator 定义

示例：
// @corp/common-utils/src/navigate.ts
export function jumpTo(path: string, query?: object) {
  history.push({ pathname: path, search: qs.stringify(query) });
}
→ 产出：{ name: "jumpTo", module: "@corp/common-utils", pathArgIndex: 0, queryArgIndex: 1 }
```

对于组件形式的封装（如 `<CorpLink to="/xxx">`），分析其 render 中是否使用了 `<Link>` 或 `<NavLink>`，以及 `to` prop 映射到了哪个外部 prop。

### 6.3 局限与兜底

- 如果封装层次超过 2 层，不再深追，标记为需人工配置
- 分析结果与用户配置 merge，用户配置优先级更高

---

## 7. 阶段三：AST 确定性提取（核心）

### 7.1 技术选型

- Parser：`@babel/parser`，启用 jsx + typescript + decorators 插件
- Traverser：`@babel/traverse`
- 辅助：`@babel/types` 用于节点类型判断

### 7.2 模块路径解析（Alias Resolver）

AST 提取路由和跳转时，核心操作是追溯 `import` 来源——`<Route component={List} />` 中 `List` 到底对应哪个文件。项目里的 import 路径几乎不会是真实相对路径，而是各种 alias：

```typescript
// 实际代码中你会遇到的路径形式
import List from '@/pages/trade/List';           // tsconfig paths alias
import List from '@pages/trade/List';            // webpack resolve.alias
import List from 'pages/trade/List';             // webpack modules 配置
import { jumpTo } from '@corp/common-utils';     // monorepo workspace 包
import Detail from '~/pages/trade/Detail';       // 自定义前缀
```

如果不解析这些 alias，`resolveComponentRef` 拿到的 import source 是 `@/pages/trade/List` 这种字符串，无法定位到真实文件，路由注册表里的 `componentFile` 字段就是空的，跳转关系也没法建立。

#### 7.2.1 解析策略

按优先级依次尝试以下配置源：

**1. tsconfig.json / jsconfig.json 的 paths 字段**

这是最常见的 alias 来源。大部分项目配了 `"@/*": ["src/*"]` 这种映射。

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@pages/*": ["src/pages/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

解析逻辑：读 tsconfig.json → 提取 `baseUrl` + `paths` → 构建映射表。注意 monorepo 下子应用可能有自己的 tsconfig 继承根配置（`extends`），需要递归解析。

推荐使用 `tsconfig-paths` 这个库，它能处理 extends 继承和 paths 通配符匹配。

**2. webpack 的 resolve.alias 和 resolve.modules**

部分老项目不用 tsconfig paths，而是靠 webpack 配置：

```javascript
// webpack.config.js
resolve: {
  alias: {
    '@': path.resolve(__dirname, 'src'),
    '@corp/common-utils': path.resolve(__dirname, '../common-utils/src'),
  },
  modules: ['node_modules', 'src']  // 允许直接 import 'pages/xxx'
}
```

解析逻辑：找到 webpack 配置文件 → 提取 `resolve.alias` 和 `resolve.modules`。这步有点棘手，因为 webpack 配置本身是 JS，可能有动态逻辑。务实的做法是用正则 + 简单 AST 提取字面量配置，复杂的动态配置走手动声明。

**3. package.json 的 workspace 包名映射**

monorepo 下 `import { jumpTo } from '@corp/common-utils'` 实际指向 `packages/common-utils/src/index.ts`。这个通过读 package.json 的 `name` 字段和 `main` / `module` 入口字段来定位。

**4. 手动配置兜底**

`route-analyzer.json` 中增加 `aliases` 字段，处理以上自动探测覆盖不了的情况：

```json
{
  "aliases": {
    "~": "./src",
    "@legacy": "./src/legacy-modules",
    "@corp/common-utils": "../common-utils/src"
  }
}
```

#### 7.2.2 AliasResolver 实现

```typescript
interface AliasResolver {
  /**
   * 将 import 路径解析为真实的文件系统绝对路径
   * @param importPath  - 代码中的 import 路径，如 '@/pages/trade/List'
   * @param fromFile    - 当前文件路径（用于解析相对路径）
   * @returns 绝对文件路径，或 null（无法解析）
   */
  resolve(importPath: string, fromFile: string): string | null;
}

// 解析优先级
class ChainedAliasResolver implements AliasResolver {
  private resolvers: AliasResolver[];

  constructor(projectRoot: string, appEntry: AppEntry) {
    this.resolvers = [
      new RelativePathResolver(),                    // ./xxx, ../xxx 直接解析
      new TsconfigPathsResolver(projectRoot),        // tsconfig paths
      new WebpackAliasResolver(projectRoot),          // webpack resolve.alias
      new WorkspacePackageResolver(projectRoot),      // monorepo 包名
      new ManualAliasResolver(appEntry.aliases),      // 手动配置
    ];
  }

  resolve(importPath: string, fromFile: string): string | null {
    for (const resolver of this.resolvers) {
      const result = resolver.resolve(importPath, fromFile);
      if (result) return result;
    }
    return null; // 所有 resolver 都失败，标记为 unresolved
  }
}
```

#### 7.2.3 文件扩展名探测

import 路径通常不写扩展名（`import List from '@/pages/List'`），需要依次尝试：

```
@/pages/List
  → src/pages/List.tsx
  → src/pages/List.ts
  → src/pages/List.jsx
  → src/pages/List.js
  → src/pages/List/index.tsx
  → src/pages/List/index.ts
  → src/pages/List/index.jsx
  → src/pages/List/index.js
```

探测顺序按项目的主要技术栈调整（TypeScript 项目优先 .tsx/.ts）。

#### 7.2.4 解析失败的处理

如果 AliasResolver 无法解析某个 import 路径：
- 不中断分析流程
- 对应的 RouteEntry.componentFile 标记为 `"unresolved:@/pages/trade/List"`
- 汇总输出所有未解析的 import 路径，方便用户补充 aliases 配置
- 在 stats 中增加 `unresolvedImports` 计数

### 7.3 Extractor 拆分

#### 7.3.1 RouteConfigExtractor — 路由注册提取

负责从路由配置文件中提取所有 `RouteEntry`。

**需要处理的模式：**

| # | 模式 | 示例 | 难度 |
|---|------|------|------|
| 1 | JSX `<Route>` | `<Route path="/list" component={List} />` | 低 |
| 2 | JSX 嵌套路由 | `<Route path="/trade"><Route path="list" .../></Route>` | 中 |
| 3 | 配置数组 | `[{ path: '/list', component: List }]` | 低 |
| 4 | v3 getChildRoutes | `getChildRoutes(location, cb) { cb(null, [...]) }` | 高 |
| 5 | lazy import | `component: lazy(() => import('./List'))` | 中 |
| 6 | React.lazy + Suspense | `const List = React.lazy(() => import('./List'))` | 中 |
| 7 | loadable | `loadable(() => import('./List'))` | 中 |
| 8 | 变量引用 | `const routes = [...]; <Route {...routes[0]} />` | 高→unresolved |

**AST 遍历逻辑（伪代码）：**

```javascript
// 模式1/2: JSX <Route>
visitor: {
  JSXElement(path) {
    if (getJSXName(path) !== 'Route') return;
    const pathAttr = getJSXAttr(path, 'path');
    const compAttr = getJSXAttr(path, 'component') || getJSXAttr(path, 'render');

    const routePath = resolveAttrValue(pathAttr); // 字面量 → string，否则 → null
    const component = resolveComponentRef(compAttr); // 标识符 → 追溯 import

    // 递归处理子 <Route>
    const children = path.get('children')
      .filter(child => isRouteElement(child))
      .map(child => extractRoute(child));

    emit({
      path: routePath,
      componentFile: component?.source,
      componentName: component?.name,
      lazy: isLazyImport(compAttr),
      children,
      source: 'ast',
      loc: path.node.loc
    });
  }
}

// 模式3: 配置数组
visitor: {
  ArrayExpression(path) {
    // 判断是否是路由配置数组（元素包含 path + component 属性的对象）
    for (const element of path.get('elements')) {
      if (!element.isObjectExpression()) continue;
      const pathProp = getObjectProp(element, 'path');
      const compProp = getObjectProp(element, 'component')
                    || getObjectProp(element, 'getComponent');
      if (!pathProp) continue;
      // ... 同上提取逻辑
    }
  }
}
```

**组件引用解析 `resolveComponentRef`：**

```javascript
function resolveComponentRef(attrValue) {
  // Case 1: <Route component={List} /> — 标识符
  if (t.isJSXExpressionContainer(attrValue)) {
    const expr = attrValue.expression;
    if (t.isIdentifier(expr)) {
      // 在当前文件 scope 中查找这个标识符的 import 来源
      const binding = path.scope.getBinding(expr.name);
      if (binding && isImportDeclaration(binding.path.parent)) {
        return {
          name: expr.name,
          source: resolveImportPath(binding.path.parent.source.value)
        };
      }
    }
    // Case 2: lazy(() => import('./List'))
    if (isLazyCall(expr)) {
      const importPath = extractDynamicImportPath(expr);
      return { name: 'default', source: resolveImportPath(importPath), lazy: true };
    }
  }
  return null; // unresolved
}
```

#### 7.3.2 NavigationCallExtractor — 跳转调用提取

负责从所有组件文件中提取跳转行为，产出 `NavigationEdge`。

**需要处理的模式：**

| # | 模式 | 示例 |
|---|------|------|
| 1 | history.push/replace | `this.props.history.push('/detail/123')` |
| 2 | useNavigate (v6兼容) | `const nav = useNavigate(); nav('/list')` |
| 3 | Link / NavLink | `<Link to="/detail/123">` |
| 4 | Link 对象形式 | `<Link to={{ pathname: '/detail', state: { id } }}>` |
| 5 | 模板字符串 | `` history.push(`/detail/${id}`) `` |
| 6 | redirect | `<Redirect from="/old" to="/new" />` |
| 7 | 自定义方法 | `jumpTo('/trade/list', { status: 'active' })` |
| 8 | 自定义组件 | `<CorpLink to="/xxx" params={{ id }}>` |
| 9 | window.location | `window.location.href = '/xxx'` |
| 10 | 路由守卫中的跳转 | `onEnter: (nextState, replace) => replace('/login')` |

**history.push/replace 的提取逻辑：**

```javascript
visitor: {
  CallExpression(path) {
    const callee = path.get('callee');

    // 匹配 xxx.push() / xxx.replace()
    if (!callee.isMemberExpression()) return;
    const method = callee.get('property');
    if (!['push', 'replace'].includes(method.node.name)) return;

    // 验证调用者是 history 对象
    // 模式: history.push / this.props.history.push / props.history.push
    if (!isHistoryObject(callee.get('object'))) return;

    const args = path.get('arguments');
    const edge = extractNavigationTarget(args, `history.${method.node.name}`);
    emit(edge);
  }
}
```

**提取跳转目标 `extractNavigationTarget`：**

```javascript
function extractNavigationTarget(args, method) {
  const firstArg = args[0];

  // Case 1: 字符串字面量 → high confidence
  if (firstArg.isStringLiteral()) {
    const parsed = parseRoutePath(firstArg.node.value);
    return {
      to: { path: parsed.pathname },
      params: { query: parsed.query, hash: parsed.hash },
      method,
      confidence: 'high'
    };
  }

  // Case 2: 模板字符串 → 提取静态部分 + 标记变量
  if (firstArg.isTemplateLiteral()) {
    const { staticParts, dynamicParts } = parseTemplateLiteral(firstArg);
    // 尝试匹配已知路由 pattern
    // e.g., `/detail/${id}` 可能匹配 `/detail/:id`
    const pattern = buildPatternFromTemplate(staticParts);
    return {
      to: { path: pattern },
      params: {
        pathParams: dynamicParts.reduce((acc, part, i) => {
          acc[`$${i}`] = { type: 'template', template: firstArg.node, variables: [part.name] };
          return acc;
        }, {})
      },
      method,
      confidence: 'medium'
    };
  }

  // Case 3: 对象形式 { pathname, search, state, query }
  if (firstArg.isObjectExpression()) {
    const pathname = extractObjectProp(firstArg, 'pathname');
    const search = extractObjectProp(firstArg, 'search');
    const query = extractObjectProp(firstArg, 'query');
    const state = extractObjectProp(firstArg, 'state');

    return {
      to: { path: resolveValue(pathname) },
      params: {
        query: resolveObjectValue(query || search),
        state: resolveObjectValue(state)
      },
      method,
      confidence: pathname?.isStringLiteral() ? 'high' : 'low'
    };
  }

  // Case 4: 变量 → unresolved
  return {
    to: { rawExpression: generate(firstArg.node).code },
    method,
    confidence: 'low'
  };
}
```

**Link / NavLink 的提取逻辑：**

```javascript
visitor: {
  JSXElement(path) {
    const name = getJSXName(path);
    if (!['Link', 'NavLink', 'Redirect', ...customLinkComponents].includes(name)) return;

    const toProp = getJSXAttr(path, 'to') || getJSXAttr(path, 'href');
    if (!toProp) return;

    // 复用 extractNavigationTarget 的解析逻辑
    const edge = resolveJSXAttrAsNavTarget(toProp, name);

    // Redirect 额外提取 from
    if (name === 'Redirect') {
      edge.redirectFrom = resolveJSXAttrValue(getJSXAttr(path, 'from'));
    }

    emit(edge);
  }
}
```

**自定义方法的提取逻辑：**

```javascript
// 根据 CustomNavigator 配置动态生成匹配规则
function buildCustomNavigatorVisitor(navigators) {
  return {
    CallExpression(path) {
      const calleeName = getCalleeName(path);
      const navigator = navigators.find(n => n.name === calleeName);
      if (!navigator) return;

      // 验证 import 来源
      if (!isImportedFrom(path, navigator.module)) return;

      const args = path.get('arguments');
      const pathArg = args[navigator.pathArgIndex];
      const queryArg = navigator.queryArgIndex != null ? args[navigator.queryArgIndex] : null;
      const stateArg = navigator.stateArgIndex != null ? args[navigator.stateArgIndex] : null;

      emit({
        to: resolveArgValue(pathArg),
        params: {
          query: queryArg ? resolveObjectValue(queryArg) : undefined,
          state: stateArg ? resolveObjectValue(stateArg) : undefined,
        },
        method: navigator.name,
        confidence: pathArg?.isStringLiteral() ? 'high' : 'low'
      });
    }
  };
}
```

#### 7.3.3 ParamExtractor — 参数深度提取

内嵌在上面两个 extractor 中调用，核心是 `resolveValue` 函数：

```javascript
function resolveValue(node): ParamValue {
  // 字面量
  if (t.isStringLiteral(node)) return { type: 'literal', value: node.value };
  if (t.isNumericLiteral(node)) return { type: 'literal', value: node.value };
  if (t.isBooleanLiteral(node)) return { type: 'literal', value: node.value };

  // 模板字符串
  if (t.isTemplateLiteral(node)) {
    return {
      type: 'template',
      template: buildTemplateString(node),
      variables: node.expressions.map(e => generate(e).code)
    };
  }

  // 对象 → 递归
  if (t.isObjectExpression(node)) {
    const result = {};
    for (const prop of node.properties) {
      if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
        result[prop.key.name] = resolveValue(prop.value);
      }
    }
    return result;
  }

  // 兜底：标记为 unresolved，保留原始表达式
  return { type: 'unresolved', expression: generate(node).code };
}
```

### 7.4 文件扫描策略

```
1. 从 routeEntries 开始，提取路由注册表
2. 扫描 app 下所有 .tsx/.jsx/.ts/.js 文件（排除 node_modules, test, __test__, .spec, .test）
3. 对每个文件先做快速预扫描（正则匹配），只有包含以下关键词的才进 AST 分析：
   - import.*react-router / import.*history
   - Link|NavLink|Route|Redirect|Switch
   - history\.push|history\.replace|useNavigate|useHistory
   - 配置中声明的自定义方法名
4. 预扫描命中的文件进入完整 AST 分析
```

这个预扫描步骤在大型项目中可以过滤掉 80%+ 的文件，显著提升速度。

### 7.5 各 Extractor 输出汇总

```
RouteConfigExtractor → RouteEntry[]
NavigationCallExtractor → NavigationEdge[] (含 resolved + unresolved)

其中 unresolved 的 edge 满足以下条件之一：
- to.path 为空，仅有 to.rawExpression
- confidence 为 'low'
- params 中存在 type: 'unresolved' 的值
```

---

## 8. 阶段四：LLM 批量补全

### 8.1 工作流

```
1. 收集所有 unresolved edges
2. 按文件分组，每组附上：
   - 该文件的完整 import 列表
   - 跳转调用的上下文代码（前后 15 行）
   - 当前项目的完整路由表（作为候选列表）
3. 每批 ≤ batchSize 条，调用 LLM API
4. 解析返回的 JSON，merge 进 edges 列表
5. LLM 返回的结果 confidence 统一标记为 'medium'，resolvedBy 标记为 'llm'
```

### 8.2 Prompt 模板

```
你是一个 React 前端代码分析助手。

## 任务
根据代码片段和上下文，推断跳转目标路由和参数。

## 已知路由表（只能从中选择）
${JSON.stringify(routeTable, null, 2)}

## 待分析的跳转调用
${unresolvedEdges.map((edge, i) => `
### 调用 ${i + 1}
- 文件：${edge.from.file}:${edge.from.line}
- 方法：${edge.method}
- 原始表达式：${edge.to.rawExpression}
- 上下文代码：
\`\`\`
${edge.context}
\`\`\`
- 该文件的 import 列表：
${edge.imports.join('\n')}
`).join('\n')}

## 输出要求
返回 JSON 数组，每个元素对应一条调用，格式：
{
  "index": 0,
  "targetPath": "/trade/detail/:id",  // 从已知路由表中选择，如果无法确定填 null
  "params": {
    "pathParams": { "id": "来自 props.match.params.id" },
    "query": { "tab": "info" },
    "state": null
  },
  "reasoning": "简要说明推理依据"
}

只返回 JSON，不要其他内容。
```

### 8.3 结果校验

```
对 LLM 返回的每条结果：
1. targetPath 必须存在于已知路由表中（否则丢弃）
2. 如果 targetPath 包含 :param，检查 params.pathParams 中是否有对应 key
3. reasoning 仅用于 debug 日志，不进入最终输出
```

### 8.4 降级策略

```
- LLM 不可用 → 跳过此阶段，unresolved 保持原样输出
- LLM 返回格式错误 → 重试 1 次，仍失败则跳过该批次
- 整体超时 → 已完成的批次结果保留，未完成的标记为 unresolved
```

---

## 9. 阶段五：合并与输出

### 9.1 Monorepo 路由拼接

```
如果是 monorepo 且存在 host 应用的 mounts 配置：
- 将 sub-app 的路由 path 加上 mount 前缀
  e.g., host mounts: { "/trade": "trade-app" }
       trade-app 内部路由: /list, /detail/:id
       → 最终路由: /trade/list, /trade/detail/:id
- 跨应用跳转自动识别：
  trade-app 中 history.push('/risk/report')
  → target 匹配到 risk-app 的 /report 路由
  → edge 标记 crossApp: true
```

### 9.2 人工补充 Merge

```
读取 dynamicRoutes JSON 文件（格式同 RouteEntry[]，source 固定为 'manual'）
→ 合并进路由表
→ 重新跑一遍路由匹配，看是否有 unresolved edge 的 rawExpression
   能匹配到这些手动路由
```

### 9.3 变更影响分析

给定输入：被修改的路由 path 或组件文件路径

```javascript
function analyzeImpact(target: string, edges: NavigationEdge[], routes: RouteEntry[]) {
  // 1. 找到目标路由
  const targetRoutes = routes.filter(r =>
    r.path === target || r.componentFile === target
  );

  // 2. 反向查跳转来源
  const incomingEdges = edges.filter(e =>
    targetRoutes.some(r => matchPath(e.to.path, r.path))
  );

  // 3. 构建影响树（可扩展为 N 跳）
  return {
    target: targetRoutes,
    directSources: incomingEdges.map(e => ({
      file: e.from.file,
      component: e.from.componentName,
      method: e.method,
      params: e.params,
      confidence: e.confidence
    })),
    paramDependencies: extractParamDependencies(incomingEdges)
  };
}
```

影响报告输出示例：

```json
{
  "target": {
    "path": "/trade/detail/:id",
    "componentFile": "src/pages/trade/Detail.tsx"
  },
  "directSources": [
    {
      "file": "src/pages/trade/List.tsx",
      "component": "TradeList",
      "method": "history.push",
      "params": {
        "pathParams": { "id": { "type": "template", "expression": "record.id" } }
      },
      "confidence": "high"
    },
    {
      "file": "src/pages/dashboard/Overview.tsx",
      "component": "Overview",
      "method": "CorpLink",
      "params": {
        "pathParams": { "id": { "type": "unresolved", "expression": "selectedTradeId" } },
        "query": { "from": { "type": "literal", "value": "dashboard" } }
      },
      "confidence": "medium"
    }
  ],
  "paramDependencies": {
    "id": "required — 2 sources pass this param (1 resolved, 1 unresolved)",
    "query.from": "optional — 1 source passes 'dashboard'"
  }
}
```

---

## 10. CLI 接口设计

```bash
# 全量分析
route-analyzer analyze ./project -o result.json

# 指定配置
route-analyzer analyze ./project --config route-analyzer.json -o result.json

# 变更影响分析
route-analyzer impact ./project --target "/trade/detail/:id" -o impact.json
route-analyzer impact ./project --target "src/pages/trade/Detail.tsx" -o impact.json

# 仅提取路由表（跳过跳转分析和 LLM）
route-analyzer routes ./project -o routes.json

# 跳过 LLM 阶段
route-analyzer analyze ./project --no-llm -o result.json

# 输出 unresolved 列表（用于排查和人工补充）
route-analyzer unresolved ./project -o unresolved.json
```

退出码约定：
- 0：分析成功
- 1：分析完成但有 unresolved（CI 场景可配置是否视为失败）
- 2：致命错误（找不到项目、配置错误等）

---

## 11. Skill 定义

Skill 文件放在项目仓库的 `.agent/skills/route-analyzer/SKILL.md`，或者 agent 平台的全局 Skills 目录中。以下是完整内容：

````markdown
# Route Analyzer — 路由跳转关系分析

## 能力描述
分析 React 项目（含 monorepo）的路由注册和页面跳转关系，核心用于变更影响分析。

## 前置条件
- 项目已全局安装：`npm install -g @corp/route-analyzer`
- 如果项目有自定义跳转封装，需要在项目根目录配置 `route-analyzer.json`

## 可用命令

### 全量分析
```bash
route-analyzer analyze <project-dir> -o result.json
```
输出完整路由表 + 跳转关系图。适用于用户问"项目有哪些路由""页面之间怎么跳转"。

### 变更影响分析
```bash
route-analyzer impact <project-dir> --target "<路由path或组件文件>" -o impact.json
```
给定被修改的路由或组件，反向查出所有跳转来源和参数依赖。适用于用户问"改了这个页面会影响哪里""哪些地方跳到这个页面"。

### 仅提取路由表
```bash
route-analyzer routes <project-dir> -o routes.json
```
快速查看项目路由列表，不做跳转关系分析。

### 查看未解析项
```bash
route-analyzer unresolved <project-dir>
```
列出 AST 无法确定的跳转调用。如果未解析比例高，建议用户检查 `route-analyzer.json` 中的 `customNavigators` 配置。

## 输出格式说明
- routes：`RouteEntry[]`，每条包含 path、componentFile、lazy、source 字段
- edges：`NavigationEdge[]`，每条包含 from（来源文件+行号）、to（目标路径）、method（跳转方式）、params（参数）、confidence（置信度 high/medium/low）
- impact 报告：包含 directSources（直接跳转来源）和 paramDependencies（参数依赖汇总）

## 结果解读建议
- confidence: high 的条目可直接信任
- confidence: medium 是 LLM 推断结果，建议人工确认关键路径
- confidence: low 或 to.rawExpression 存在的条目，是变量传参等无法静态确定的，需要看代码上下文判断
- 如果 stats.unresolvedEdges 占比超过 30%，项目可能大量使用了未配置的自定义跳转封装

## 典型使用场景
1. 用户说"我要改 trade 详情页的入参" → 跑 `impact --target "/trade/detail/:id"`，告诉用户有哪些页面跳过来、传了什么参数
2. 用户说"帮我理清这个项目的路由结构" → 跑 `analyze`，概述路由树和关键跳转关系
3. 用户说"这个项目有多少页面" → 跑 `routes`，汇总路由数量和分布
````

---

## 12. 迭代计划

### Phase 1 — Core Library + CLI + 单应用纯 AST（1-2 周）

- 搭建 Core Library / CLI 两层项目结构
- 实现项目探测（非 monorepo）
- RouteConfigExtractor：模式 1-3（JSX Route + 配置数组）
- NavigationCallExtractor：模式 1-4（history.push + Link 基础形式）
- CLI 子命令：analyze、routes
- 输出 JSON，手动验证
- 交付标准：对一个标准 v5 项目能提取出 80%+ 的路由和跳转关系

### Phase 2 — LLM 补全 + 自定义方法（1 周）

- 实现 LLM 批量补全阶段
- 自定义方法配置 + extractor
- Shared Lib 预分析
- CLI 子命令：unresolved
- 交付标准：unresolved 率降到 20% 以下

### Phase 3 — Monorepo + 影响分析（1 周）

- Monorepo 应用发现
- 路由前缀拼接、跨应用跳转识别
- 变更影响分析
- CLI 子命令：impact
- 交付标准：对 monorepo 项目能输出完整跳转图 + 影响报告

### Phase 4 — Skill + CI + 工程化（持续）

- 编写 SKILL.md，在 OpenCode / Claude Code 中验证 agent 能正确调用 CLI 并解读输出
- CI 集成（MR 触发分析，影响报告贴到 MR 评论）
- 动态路由运行时抓取中间件
- Web 可视化（可选）
- v3 特殊模式支持（getChildRoutes 等）

---

## 13. 依赖清单

```json
{
  "dependencies": {
    "@babel/parser": "^7.24.0",
    "@babel/traverse": "^7.24.0",
    "@babel/types": "^7.24.0",
    "@babel/generator": "^7.24.0",
    "tsconfig-paths": "^4.2.0",
    "fast-glob": "^3.3.0",
    "commander": "^12.0.0"
  },
  "optionalDependencies": {
    "openai": "^4.0.0"
  }
}
```

说明：
- `tsconfig-paths`：解析 tsconfig.json 的 paths alias，支持 extends 继承链
- `fast-glob`：替代 glob，扫描性能更好
- `openai`：LLM 调用使用 OpenAI SDK 的兼容接口（`baseURL` 指向 MiniMax 或其他兼容 API），不额外引入 SDK