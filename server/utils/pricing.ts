import { Prisma } from '@prisma/client'

export function calculateSubtotal(items: { price: Prisma.Decimal; quantity: number }[]) {
  return items.reduce(
    (subtotal, item) => subtotal.add(item.price.mul(item.quantity)),
    new Prisma.Decimal(0)
  )
}
