import { prisma } from '../../utils/db'

export default defineEventHandler(() => prisma.campaign.findMany({
  where: { active: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
  orderBy: { endsAt: 'asc' }
}))
