import { describe, expect, it } from 'vitest'
import { buildDashboardTrend } from '../server/utils/dashboard'

describe('administrator dashboard trend', () => {
  it('includes all days and only counts paid non-cancelled sales', () => {
    const trend = buildDashboardTrend([
      { createdAt: new Date('2026-01-01T12:00:00.000Z'), status: 'DELIVERED', payment: { status: 'PAID', amount: '12.00' } },
      { createdAt: new Date('2026-01-01T13:00:00.000Z'), status: 'PENDING', payment: { status: 'PENDING', amount: '30.00' } },
      { createdAt: new Date('2026-01-02T12:00:00.000Z'), status: 'CANCELLED', payment: { status: 'PAID', amount: '8.00' } }
    ], new Date('2026-01-01T00:00:00.000Z'), new Date('2026-01-03T23:59:59.999Z'))

    expect(trend).toEqual([
      { date: '2026-01-01', orders: 2, sales: 12 },
      { date: '2026-01-02', orders: 1, sales: 0 },
      { date: '2026-01-03', orders: 0, sales: 0 }
    ])
  })
})
