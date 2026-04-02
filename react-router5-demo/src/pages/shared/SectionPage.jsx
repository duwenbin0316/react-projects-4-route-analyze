import { NavLink, Redirect, Route, Switch, useLocation, useRouteMatch } from 'react-router-dom'
import { buildPath, sectionMap, sections } from '../../config/sections'

function SectionPage({ section }) {
  const match = useRouteMatch()
  const location = useLocation()
  const sectionIndex = sections.findIndex((item) => item.slug === section.slug)
  const previousSection = sections[(sectionIndex - 1 + sections.length) % sections.length]
  const nextSection = sections[(sectionIndex + 1) % sections.length]

  return (
    <section className="panel" style={{ '--accent': section.accent }}>
      <div className="hero-card">
        <div>
          <p className="eyebrow">{section.label}</p>
          <h2>{section.title}</h2>
          <p className="section-description">{section.description}</p>
        </div>

        <div className="hero-actions">
          <NavLink className="ghost-button" to={buildPath(previousSection.slug, previousSection.children[0].slug)}>
            上一个模块
          </NavLink>
          <NavLink className="solid-button" to={buildPath(nextSection.slug, nextSection.children[0].slug)}>
            下一个模块
          </NavLink>
        </div>
      </div>

      <div className="stats-grid">
        {section.stats.map((item) => (
          <article key={item} className="stat-card">
            <span>关键指标</span>
            <strong>{item}</strong>
          </article>
        ))}
      </div>

      <div className="subnav">
        {section.children.map((child) => (
          <NavLink
            key={child.slug}
            className="subnav-link"
            activeClassName="is-active"
            to={`${match.url}/${child.slug}`}
          >
            {child.title}
          </NavLink>
        ))}
      </div>

      <Switch>
        <Route exact path={match.path}>
          <Redirect to={`${match.url}/${section.children[0].slug}`} />
        </Route>

        {section.children.map((child, childIndex) => (
          <Route key={child.slug} path={`${match.path}/${child.slug}`}>
            <ChildRouteView
              child={child}
              childIndex={childIndex}
              location={location}
              nextSection={nextSection}
              previousSection={previousSection}
              section={section}
            />
          </Route>
        ))}
      </Switch>
    </section>
  )
}

function ChildRouteView({ section, child, childIndex, previousSection, nextSection, location }) {
  const sibling = section.children[(childIndex + 1) % section.children.length]
  const relatedSections = section.related.map((slug) => sectionMap[slug]).filter(Boolean)

  return (
    <div className="route-body">
      <article className="content-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">{section.title}</p>
            <h3>{child.title}</h3>
          </div>
          <span className="route-pill">{location.pathname}</span>
        </div>

        <p className="card-copy">{child.summary}</p>

        <div className="action-grid">
          <NavLink className="action-card" to={buildPath(section.slug, sibling.slug)}>
            <span>当前模块内跳转</span>
            <strong>{sibling.title}</strong>
            <small>切换到同一顶层路由下的另一个子路由。</small>
          </NavLink>

          <NavLink className="action-card" to={buildPath(nextSection.slug, nextSection.children[0].slug)}>
            <span>跨模块跳转</span>
            <strong>{nextSection.title}</strong>
            <small>跳到相邻顶层路由，形成完整浏览链路。</small>
          </NavLink>

          <NavLink className="action-card" to={buildPath(previousSection.slug, previousSection.children[1].slug)}>
            <span>回看上游模块</span>
            <strong>{previousSection.children[1].title}</strong>
            <small>回到上一个模块的子页面查看上下文。</small>
          </NavLink>
        </div>
      </article>

      <section className="content-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Related Routes</p>
            <h3>模块联动导航</h3>
          </div>
        </div>

        <div className="related-grid">
          {relatedSections.map((item) => (
            <NavLink
              key={item.slug}
              className="related-card"
              to={buildPath(item.slug, item.children[0].slug)}
            >
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </NavLink>
          ))}
        </div>
      </section>
    </div>
  )
}

export default SectionPage
