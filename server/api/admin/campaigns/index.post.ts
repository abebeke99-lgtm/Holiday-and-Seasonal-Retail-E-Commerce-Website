import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { prisma } from '../../../utils/db'
import { validatedBody } from '../../../utils/validation'

const campaignSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(10000).default(''),
  discountPct: z.number().int().min(0).max(100),
  startsAt: z.iso.datetime().transform(value => new Date(value)),
  endsAt: z.iso.datetime().transform(value => new Date(value)),
  active: z.boolean().default(true)
}).refine(data => data.endsAt > data.startsAt, { path: ['endsAt'], message: 'End must be after start' })

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const body = await validatedBody(event, campaignSchema)
  const campaign = await prisma.campaign.create({ data: body })
  await prisma.auditLog.create({ data: { actorId: actor.id, action: 'create', entity: 'campaign', entityId: campaign.id } })
  setResponseStatus(event, 201)
  return campaign
})
