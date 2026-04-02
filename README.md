# react-projects-4-route-analyze

用于构建和维护多个 React 示例项目，专门服务于“React 路由跳转关系分析工具”的开发与验证。

## 目标

- 模拟不同类型 React 项目的路由注册方式
- 模拟不同页面之间的跳转关系和参数传递方式
- 为静态分析、未解析项补全、影响分析提供测试样本

## 当前目录结构

```text
.
├── AGENTS.md
├── React路由跳转关系分析工具-技术设计文档.md
├── react-monorepo-host-subapps/
├── react-router3-legacy/
├── react-router5-config-array/
├── react-router5-custom-nav/
├── react-router5-demo/
├── react-router5-dynamic-unresolved/
├── react-router5-lazy/
└── README.md
```

## 当前项目

### `react-router5-demo`

基于 React Router v5 的前端示例项目，包含：

- 10+ 顶层路由
- 每个顶层路由下的子路由
- 模块内跳转
- 跨模块跳转
- 独立的 `src/pages` 页面目录结构

适合用于验证：

- JSX `Route` 路由提取
- 嵌套路由提取
- `Link` / `NavLink` 跳转提取
- `Redirect` 提取
- 基础页面跳转关系图构建

### `react-router5-config-array`

用于验证配置数组形式的路由定义，以及 `history.push` 对象形式、`history.replace`、`Link`/`NavLink` 等基础跳转提取。

### `react-router5-lazy`

用于验证 `React.lazy`、`Suspense` 和懒加载页面组件的路由识别。

### `react-router5-custom-nav`

用于验证自定义跳转方法、自定义 Link 组件，以及 `route-analyzer.json` 中 `customNavigators` 的配置能力。

### `react-router5-dynamic-unresolved`

用于验证路径构造函数、变量中转、动态字符串拼接等 unresolved 场景。

### `react-monorepo-host-subapps`

用于验证 monorepo 应用发现、host/sub-app 挂载、共享导航工具，以及跨应用跳转识别。

### `react-router3-legacy`

基于 webpack 的 React Router v3 老项目样本，用于验证配置对象、`IndexRoute`、`getChildRoutes`、`getComponent`、`onEnter replace`、`browserHistory` 和 `context.router.push` 等老项目模式。

## 后续建议补充的样本项目

- `react-router5-loadable`
  覆盖 `loadable()` 形式的懒加载
- `react-router5-guard-redirect`
  覆盖登录守卫、权限跳转和 `<Redirect from to>` 组合
- `react-router5-variable-routes`
  覆盖变量展开、路由片段复用和部分 unresolved 路由声明

## 使用方式

进入具体样本项目目录后再执行安装、启动和构建命令。

Vite 类样本：

```bash
cd react-router5-demo
npm install
npm run dev
```

webpack 老项目样本：

```bash
cd react-router3-legacy
npm install
npm run start
```
