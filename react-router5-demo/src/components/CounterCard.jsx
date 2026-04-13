import { useState } from 'react'

// CounterCard 用来演示计数、步进、历史和里程碑提示
const cardStyle = { display: 'flex', flexDirection: 'column', gap: '12px' }
const rowStyle = { display: 'flex', gap: '8px' }
const wrapRowStyle = { ...rowStyle, flexWrap: 'wrap' }
const sectionStyle = { display: 'grid', gap: '8px' }
const sectionLabelStyle = { fontSize: '0.75rem', opacity: 0.75 }
const metricCardStyle = {
  padding: '8px 10px',
  borderRadius: '12px',
  background: 'rgba(255, 255, 255, 0.04)',
}
const metricLabelStyle = { opacity: 0.7 }
const historyRowStyle = { display: 'flex', justifyContent: 'space-between', gap: '12px' }
const inputStyle = {
  minWidth: '100px',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  background: 'rgba(15, 23, 42, 0.35)',
  color: 'inherit',
}
const streakStyle = {
  padding: '8px 10px',
  borderRadius: '12px',
  background: 'rgba(245, 158, 11, 0.14)',
  fontSize: '0.8rem',
}

function CounterCard({ title = '计数器示例', initial = 0 }) {
  const [count, setCount] = useState(initial)
  const [step, setStep] = useState(1)
  const [bounds, setBounds] = useState({ min: initial, max: initial })
  const [history, setHistory] = useState([{ label: '初始化', value: initial }])
  const [draftValue, setDraftValue] = useState(`${initial}`)
  const delta = count - initial
  const statusText = delta === 0 ? '当前与初始值一致' : delta > 0 ? `当前比初始值高 ${delta}` : `当前比初始值低 ${Math.abs(delta)}`
  const trendText = delta === 0 ? '持平' : delta > 0 ? '上升中' : '下降中'
  const trendColor = delta === 0 ? 'rgba(255, 255, 255, 0.12)' : delta > 0 ? 'rgba(29, 155, 95, 0.16)' : 'rgba(217, 72, 95, 0.16)'
  const formattedDelta = delta > 0 ? `+${delta}` : `${delta}`
  const stepOptions = [1, 5, 10]
  const recentAction = history[0]?.label ?? '初始化'
  const lastSnapshot = history[1]
  const averageValue = Math.round(history.reduce((sum, item) => sum + item.value, 0) / history.length)
  const reachedMilestone = delta !== 0 && Math.abs(delta) % 10 === 0
  const increaseStreak = history.reduce((streak, item) => (
    item.label.startsWith('增加') ? streak + 1 : streak
  ), 0)
  const highlightMessage = count === bounds.max && count !== initial
    ? `已刷新最高值 ${bounds.max}`
    : count === bounds.min && count !== initial
      ? `已刷新最低值 ${bounds.min}`
      : reachedMilestone
        ? `达成 ${formattedDelta} 里程碑`
        : `当前步进 ${step}，继续操作看看统计变化`
  const highlightTone = count === bounds.max && count !== initial
    ? 'rgba(29, 155, 95, 0.16)'
    : count === bounds.min && count !== initial
      ? 'rgba(217, 72, 95, 0.16)'
      : reachedMilestone
        ? 'rgba(99, 102, 241, 0.18)'
        : 'rgba(255, 255, 255, 0.05)'

  const applyCount = (nextCount, label) => {
    setCount(nextCount)
    setDraftValue(`${nextCount}`)
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

  const commitDraftValue = () => {
    const parsed = Number(draftValue)

    if (Number.isNaN(parsed)) {
      setDraftValue(`${count}`)
      return
    }

    applyCount(parsed, `手动设置为 ${parsed}`)
  }

  const revertLastChange = () => {
    if (!lastSnapshot) {
      return
    }

    applyCount(lastSnapshot.value, `撤销到 ${lastSnapshot.value}`)
  }

  const resetSession = () => {
    setCount(initial)
    setStep(1)
    setBounds({ min: initial, max: initial })
    setHistory([{ label: '重新开始', value: initial }])
    setDraftValue(`${initial}`)
  }

  return (
    <article className="stat-card" style={cardStyle}>
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
      <div style={sectionStyle}>
        <span style={sectionLabelStyle}>步进档位</span>
        <div style={wrapRowStyle}>
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
      <div style={rowStyle}>
        <button className="ghost-button" onClick={() => applyCount(count - step, `减少 ${step}`)} type="button">−{step}</button>
        <button className="solid-button" onClick={() => applyCount(count + step, `增加 ${step}`)} type="button">+{step}</button>
        <button className="ghost-button" onClick={() => applyCount(count + step * 2, `冲刺 +${step * 2}`)} type="button">冲刺 +{step * 2}</button>
        <button className="ghost-button" onClick={() => jumpTo(initial)} disabled={count === initial} type="button">回到起点</button>
      </div>
      <div style={sectionStyle}>
        <span style={sectionLabelStyle}>快捷目标</span>
        <div style={wrapRowStyle}>
          <button className="ghost-button" onClick={() => jumpTo(0)} disabled={count === 0} type="button">归零</button>
          <button className="ghost-button" onClick={() => jumpTo(initial + 10)} disabled={count === initial + 10} type="button">冲到 +10</button>
          <button className="ghost-button" onClick={() => jumpTo(initial - 10)} disabled={count === initial - 10} type="button">回撤 10</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', fontSize: '0.8rem' }}>
        <div style={metricCardStyle}>
          <div style={metricLabelStyle}>最低</div>
          <strong>{bounds.min}</strong>
        </div>
        <div style={metricCardStyle}>
          <div style={metricLabelStyle}>最高</div>
          <strong>{bounds.max}</strong>
        </div>
        <div style={metricCardStyle}>
          <div style={metricLabelStyle}>最近动作</div>
          <strong>{recentAction}</strong>
        </div>
      </div>
      <div style={sectionStyle}>
        <span style={sectionLabelStyle}>手动设置</span>
        <div style={wrapRowStyle}>
          <input
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                commitDraftValue()
              }
            }}
            style={inputStyle}
          />
          <button className="solid-button" onClick={commitDraftValue} type="button">应用数值</button>
          <button className="ghost-button" onClick={revertLastChange} disabled={!lastSnapshot} type="button">撤销一步</button>
          <button className="ghost-button" onClick={resetSession} type="button">重置记录</button>
        </div>
      </div>
      <div
        style={{
          padding: '10px 12px',
          borderRadius: '12px',
          background: highlightTone,
          fontSize: '0.875rem',
        }}
      >
        {highlightMessage}
      </div>
      <div style={{ display: 'grid', gap: '6px', fontSize: '0.875rem', opacity: 0.8 }}>
        <div>变化量：{formattedDelta}</div>
        <div>最近 5 次均值：{averageValue}</div>
        <div style={streakStyle}>本轮累计上调 {increaseStreak} 次</div>
        <div>试试切换步进档位、手动输入和撤销，观察统计卡片怎么变化。</div>
      </div>
      <div style={{ display: 'grid', gap: '6px', fontSize: '0.8rem', opacity: 0.75 }}>
        {history.map((item, index) => (
          <div key={`${item.label}-${item.value}-${index}`} style={historyRowStyle}>
            <span>{item.label}</span>
            <span>{item.value}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '0.8rem', opacity: 0.68 }}>
        连续尝试增加、回撤和撤销，可以更明显看到里程碑提示怎么变化。
      </div>
    </article>
  )
}

export default CounterCard
