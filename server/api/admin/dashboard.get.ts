import { z } from 'zod'
import { requireAdmin } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { buildDashboardTrend } from '../../utils/dashboard'

const querySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  lowStockThreshold: z.coerce.number().int().min(0).max(100000).default(5)
}).refine(({ from, to }) => !from || !to || from <= to, {
  message: 'The report start date must be on or before its end date'
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid dashboard filters' })
  }

  const now = new Date()
  const to = parsed.data.to ? new Date(`${parsed.data.to}T23:59:59.999Z`) : now
  const from = parsed.data.from
    ? new Date(`${parsed.data.from}T00:00:00.000Z`)
    : new Date(to.getTime() - 29 * 86_400_000)
  if (from > to) {
    throw createError({ statusCode: 400, statusMessage: 'The report start date must be on or before its end date' })
  }
  if (to.getTime() - from.getTime() > 365 * 86_400_000) {
    throw createError({ statusCode: 400, statusMessage: 'Dashboard date ranges cannot exceed one year' })
  }
  const lowStockThreshold = parsed.data.lowStockThreshold
  const dateFilter = { gte: from, lte: to }

  const [
    registeredUsers,
    customers,
    storeManagers,
    activeProducts,
    categories,
    activeCollections,
    activeCampaigns,
    totalOrders,
    pendingOrders,
    completedOrders,
    paidSales,
    lowStockCount,
    lowStockProducts,
    recentOrders,
    recentActivity,
    trendOrders
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'STORE_MANAGER' } }),
    prisma.product.count({ where: { active: true } }),
    prisma.category.count(),
    prisma.collection.count({ where: { active: true } }),
    prisma.campaign.count({ where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { status: 'DELIVERED' } }),
    prisma.payment.aggregate({
      where: { status: 'PAID', order: { is: { status: { not: 'CANCELLED' }, createdAt: dateFilter } } },
      _sum: { amount: true }
    }),
    prisma.inventory.count({ where: { quantity: { lte: lowStockThreshold }, product: { active: true } } }),
    prisma.inventory.findMany({
      where: { quantity: { lte: lowStockThreshold }, product: { active: true } },
      orderBy: { quantity: 'asc' },
      take: 10,
      include: { product: { select: { id: true, name: true, sku: true } } }
    }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, status: true, total: true, createdAt: true, user: { select: { name: true } } }
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { actor: { select: { name: true, email: true } } }
    }),
    prisma.order.findMany({
      where: { createdAt: dateFilter },
      select: {
        createdAt: true,
        status: true,
        payment: { select: { status: true, amount: true } }
      },
      orderBy: { createdAt: 'asc' }
    })
  ])

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    lowStockThreshold,
    lowStockCount,
    metrics: {
      registeredUsers,
      customers,
      storeManagers,
      activeProducts,
      categories,
      activeCollections,
      activeCampaigns,
      totalOrders,
      pendingOrders,
      completedOrders,
      paidSales: Number(paidSales._sum.amount ?? 0)
    },
    lowStockProducts,
    recentOrders,
    recentActivity,
    trend: buildDashboardTrend(trendOrders, from, to)
  }
})
