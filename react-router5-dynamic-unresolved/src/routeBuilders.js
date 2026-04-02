export function buildTradePath(id) {
  return `/trade/detail/${id}`
}

export function getReportTarget(type) {
  return type === 'risk' ? '/reports/risk' : '/reports/general'
}
