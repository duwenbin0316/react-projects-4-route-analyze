import { useState } from 'react'

function CounterCard({ title = '计数器示例', initial = 0 }) {
  const [count, setCount] = useState(initial)

  return (
    <article className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <span>{title}</span>
      <strong style={{ fontSize: '2rem' }}>{count}</strong>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="ghost-button" onClick={() => setCount((c) => c - 1)}>−</button>
        <button className="solid-button" onClick={() => setCount((c) => c + 1)}>+</button>
        <button className="ghost-button" onClick={() => setCount(initial)}>重置</button>
      </div>
      <div>
        <div>
          just for test
        </div>
      </div>
    </article>
  )
}

export default CounterCard
