import { requireAdmin } from './auth'
import { prisma } from './db'

export async function audit(event: Parameters<typeof requireAdmin>[0], actorId: string, action: string, entity: string, entityId: string) {
  await prisma.auditLog.create({ data: { actorId, action, entity, entityId } })
}
