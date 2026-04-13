import { useState } from 'react'

function CounterCard({ title = '计数器示例', initial = 0 }) {
  const [count, setCount] = useState(initial)
  const [step, setStep] = useState(1)
  const [bounds, setBounds] = useState({ min: initial, max: initial })
  const [history, setHistory] = useState([{ label: '初始化', value: initial }])
  const delta = count - initial
  const statusText = delta === 0 ? '当前与初始值一致' : delta > 0 ? `当前比初始值高 ${delta}` : `当前比初始值低 ${Math.abs(delta)}`
  const trendText = delta === 0 ? '持平' : delta > 0 ? '上升中' : '下降中'
  const trendColor = delta === 0 ? 'rgba(255, 255, 255, 0.12)' : delta > 0 ? 'rgba(29, 155, 95, 0.16)' : 'rgba(217, 72, 95, 0.16)'
  const formattedDelta = delta > 0 ? `+${delta}` : `${delta}`
  const stepOptions = [1, 5, 10]
  const recentAction = history[0]?.label ?? '初始化'

  const applyCount = (nextCount, label) => {
    setCount(nextCount)
    setBounds((current) => ({
      min: Math.min(current.min, nextCount),
      max: Math.max(current.max, nextCount),
    }))
    setHistory((current) => [{ label, value: nextCount }, ...current].slice(0, 5))
  }

  const jumpTo = (nextCount) => {
    const offset = nextCount - initial
    const label = offset === 0 ? '回到初始值' : offset > 0 ? `跳到 +${offset}` : `跳到 ${offset}`
    applyCount(nextCount, label)
  }

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
      <div style={{ display: 'grid', gap: '8px' }}>
        <span style={{ fontSize: '0.75rem', opacity: 0.75 }}>步进档位</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {stepOptions.map((option) => (
            <button
              key={option}
              className={step === option ? 'solid-button' : 'ghost-button'}
              onClick={() => setStep(option)}
              type="button"
            >
              每次 {option}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="ghost-button" onClick={() => applyCount(count - step, `减少 ${step}`)} type="button">−{step}</button>
        <button className="solid-button" onClick={() => applyCount(count + step, `增加 ${step}`)} type="button">+{step}</button>
        <button className="ghost-button" onClick={() => jumpTo(initial)} disabled={count === initial} type="button">回到起点</button>
      </div>
      <div style={{ display: 'grid', gap: '8px' }}>
        <span style={{ fontSize: '0.75rem', opacity: 0.75 }}>快捷目标</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="ghost-button" onClick={() => jumpTo(0)} disabled={count === 0} type="button">归零</button>
          <button className="ghost-button" onClick={() => jumpTo(initial + 10)} disabled={count === initial + 10} type="button">冲到 +10</button>
          <button className="ghost-button" onClick={() => jumpTo(initial - 10)} disabled={count === initial - 10} type="button">回撤 10</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', fontSize: '0.8rem' }}>
        <div style={{ padding: '8px 10px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.04)' }}>
          <div style={{ opacity: 0.7 }}>最低</div>
          <strong>{bounds.min}</strong>
        </div>
        <div style={{ padding: '8px 10px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.04)' }}>
          <div style={{ opacity: 0.7 }}>最高</div>
          <strong>{bounds.max}</strong>
        </div>
        <div style={{ padding: '8px 10px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.04)' }}>
          <div style={{ opacity: 0.7 }}>最近动作</div>
          <strong>{recentAction}</strong>
        </div>
      </div>
      <div style={{ display: 'grid', gap: '6px', fontSize: '0.875rem', opacity: 0.8 }}>
        <div>变化量：{formattedDelta}</div>
        <div>试试切换步进档位，再用快捷目标观察统计卡片怎么变化。</div>
      </div>
      <div style={{ display: 'grid', gap: '6px', fontSize: '0.8rem', opacity: 0.75 }}>
        {history.map((item, index) => (
          <div key={`${item.label}-${item.value}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <span>{item.label}</span>
            <span>{item.value}</span>
          </div>
        ))}
      </div>
      <div>
        i am human，hahaha

        hello world
      </div>
    </article>
  )
}

export default CounterCard
