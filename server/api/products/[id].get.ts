import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const product = await prisma.product.findFirst({
    where: { id: getRouterParam(event, 'id'), active: true },
    include: { category: true, inventory: { select: { quantity: true } } }
  })
  if (!product) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  return product
})
