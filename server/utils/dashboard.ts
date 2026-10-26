export type DashboardOrder = {
  createdAt: Date
  status: string
  payment: { status: string; amount: number | string | { toString(): string } } | null
}

export type DashboardTrend = {
  date: string
  orders: number
  sales: number
}

export function buildDashboardTrend(orders: readonly DashboardOrder[], from: Date, to: Date): DashboardTrend[] {
  const days = Math.max(1, Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1)
  const trend = new Map<string, DashboardTrend>()

  for (let day = 0; day < days; day++) {
    const date = new Date(from)
    date.setUTCDate(date.getUTCDate() + day)
    const key = date.toISOString().slice(0, 10)
    trend.set(key, { date: key, orders: 0, sales: 0 })
  }

  for (const order of orders) {
    const key = order.createdAt.toISOString().slice(0, 10)
    const day = trend.get(key)
    if (!day) continue
    day.orders += 1
    if (order.status !== 'CANCELLED' && order.payment?.status === 'PAID') {
      day.sales += Number(String(order.payment.amount))
    }
  }

  return [...trend.values()]
}
