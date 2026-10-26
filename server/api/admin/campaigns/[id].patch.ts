import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { prisma } from '../../../utils/db'
import { validatedBody } from '../../../utils/validation'

const campaignSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(10000).optional(),
  discountPct: z.number().int().min(0).max(100).optional(),
  startsAt: z.iso.datetime().transform(value => new Date(value)).optional(),
  endsAt: z.iso.datetime().transform(value => new Date(value)).optional(),
  active: z.boolean().optional()
}).refine(data => Object.keys(data).length > 0)

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = await validatedBody(event, campaignSchema)
  const current = await prisma.campaign.findUnique({ where: { id } })
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Campaign not found' })
  const startsAt = body.startsAt ?? current.startsAt
  const endsAt = body.endsAt ?? current.endsAt
  if (endsAt <= startsAt) throw createError({ statusCode: 400, statusMessage: 'End must be after start' })
  const campaign = await prisma.campaign.update({ where: { id }, data: body })
  await prisma.auditLog.create({ data: { actorId: actor.id, action: 'update', entity: 'campaign', entityId: id } })
  return campaign
})
