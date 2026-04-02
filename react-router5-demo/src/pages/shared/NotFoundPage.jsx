import { NavLink } from 'react-router-dom'
import { buildPath } from '../../config/sections'

function NotFoundPage() {
  return (
    <section className="panel">
      <div className="hero-card">
        <div>
          <p className="eyebrow">404</p>
          <h2>页面不存在</h2>
          <p className="section-description">该地址没有匹配的路由，返回首页继续浏览。</p>
        </div>
        <NavLink className="solid-button" to={buildPath('home', 'overview')}>
          返回首页
        </NavLink>
      </div>
    </section>
  )
}

export default NotFoundPage
