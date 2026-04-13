import { useState } from 'react'

function CounterCard({ title = '计数器示例', initial = 0 }) {
  const [count, setCount] = useState(initial)
  const delta = count - initial
  const statusText = delta === 0 ? '当前与初始值一致' : delta > 0 ? `当前比初始值高 ${delta}` : `当前比初始值低 ${Math.abs(delta)}`
  const trendText = delta === 0 ? '持平' : delta > 0 ? '上升中' : '下降中'
  const trendColor = delta === 0 ? 'rgba(255, 255, 255, 0.12)' : delta > 0 ? 'rgba(29, 155, 95, 0.16)' : 'rgba(217, 72, 95, 0.16)'

  return (
    <article className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <span>{title}</span>
        <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>初始值 {initial}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <strong style={{ fontSize: '2rem', lineHeight: 1 }}>{count}</strong>
        <span
          style={{
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: '999px',
            background: trendColor,
            opacity: 0.9,
          }}
        >
          {trendText}
        </span>
      </div>
      <span style={{ fontSize: '0.875rem', color: delta === 0 ? 'inherit' : delta > 0 ? '#1d9b5f' : '#d9485f' }}>
        {statusText}
      </span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="ghost-button" onClick={() => setCount((c) => c - 1)}>−</button>
        <button className="solid-button" onClick={() => setCount((c) => c + 1)}>+</button>
        <button className="ghost-button" onClick={() => setCount(initial)} disabled={count === initial}>回到起点</button>
      </div>
      <div style={{ display: 'grid', gap: '6px', fontSize: '0.875rem', opacity: 0.8 }}>
        <div>变化量：{delta > 0 ? `+${delta}` : delta}</div>
        <div>点点按钮，看看状态文案和角标会不会一起变化。</div>
      </div>
    </article>
  )
}

export default CounterCard
