import { useState } from 'react'

function CounterCard({ title = '计数器示例', initial = 0 }) {
  const [count, setCount] = useState(initial)
  const delta = count - initial
  const statusText = delta === 0 ? '当前与初始值一致' : delta > 0 ? `当前比初始值高 ${delta}` : `当前比初始值低 ${Math.abs(delta)}`

  return (
    <article className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <span>{title}</span>
        <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>初始值 {initial}</span>
      </div>
      <strong style={{ fontSize: '2rem', lineHeight: 1 }}>{count}</strong>
      <span style={{ fontSize: '0.875rem', color: delta === 0 ? 'inherit' : delta > 0 ? '#1d9b5f' : '#d9485f' }}>
        {statusText}
      </span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="ghost-button" onClick={() => setCount((c) => c - 1)}>−</button>
        <button className="solid-button" onClick={() => setCount((c) => c + 1)}>+</button>
        <button className="ghost-button" onClick={() => setCount(initial)} disabled={count === initial}>重置</button>
      </div>
      <div>
        <div>
          点点按钮，看看状态文案会不会一起变化。
        </div>
      </div>
    </article>
  )
}

export default CounterCard
