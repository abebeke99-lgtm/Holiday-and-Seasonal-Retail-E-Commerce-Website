import { requireAdmin } from '../../../utils/auth'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const result = await prisma.product.updateMany({ where: { id }, data: { active: false } })
  if (!result.count) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  await prisma.auditLog.create({ data: { actorId: actor.id, action: 'archive', entity: 'product', entityId: id } })
  return { success: true }
})
