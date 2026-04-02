import { NavLink, Redirect, Route, Switch } from 'react-router-dom'
import './App.css'
import { buildPath, sections } from './config/sections'
import { pageComponents } from './pages'
import NotFoundPage from './pages/shared/NotFoundPage'

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">React Router v5 Demo</p>
          <h1>多级路由前端项目</h1>
        </div>
        <p className="topbar-note">
          14 个顶层路由，每个路由都带 3 个子路由，并且提供模块间跳转。
        </p>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-card">
            <p className="sidebar-title">顶层路由</p>
            <nav className="section-nav">
              {sections.map((section) => (
                <NavLink
                  key={section.slug}
                  className="section-link"
                  activeClassName="is-active"
                  to={buildPath(section.slug, section.children[0].slug)}
                >
                  <span>{section.title}</span>
                  <small>{section.label}</small>
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        <main className="content">
          <Switch>
            <Route exact path="/">
              <Redirect to={buildPath(sections[0].slug, sections[0].children[0].slug)} />
            </Route>

            {sections.map((section) => {
              const PageComponent = pageComponents[section.slug]

              return (
                <Route key={section.slug} path={`/${section.slug}`}>
                  <PageComponent />
                </Route>
              )
            })}

            <Route path="*">
              <NotFoundPage />
            </Route>
          </Switch>
        </main>
      </div>
    </div>
  )
}

export default App
