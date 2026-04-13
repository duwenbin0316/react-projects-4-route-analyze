import { sectionMap } from '../../config/sections'
import CounterCard from '../../components/CounterCard'
import SectionPage from '../shared/SectionPage'

function DashboardPage() {
  return (
    <>
      <SectionPage section={sectionMap.dashboard} />
      <div style={{ padding: '0 24px 24px', display: 'flex', gap: '16px' }}>
        <CounterCard title="实时订单计数" initial={1284} />
        <CounterCard title="告警计数" initial={4} />
      </div>
    </>
  )
}

export default DashboardPage
