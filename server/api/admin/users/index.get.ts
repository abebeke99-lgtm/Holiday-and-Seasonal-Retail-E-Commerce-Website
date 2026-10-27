import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { prisma } from '../../../utils/db'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).default(''),
  role: z.enum(['CUSTOMER', 'STORE_MANAGER', 'ADMIN']).optional(),
  active: z.enum(['true', 'false']).transform(value => value === 'true').optional(),
  sort: z.enum(['name', 'email', 'role', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc')
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid user filters' })
  const { page, limit, search, role, active, sort, order } = parsed.data
  const where = {
    ...(role ? { role } : {}),
    ...(active === undefined ? {} : { active }),
    ...(search ? {
      OR: [
        { name: { contains: search } },
        { email: { contains: search.toLowerCase() } }
      ]
    } : {})
  }
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true }
    }),
    prisma.user.count({ where })
  ])
  return { items, total, page, limit, pages: Math.ceil(total / limit) }
})
