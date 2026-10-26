export type HomeWishlistItem = { id: string; productId: string }
export type HomeCartItem = { quantity: number; product: { price: string | number } }

export function findWishlistItem(items: readonly HomeWishlistItem[], productId: string) {
  return items.find(item => item.productId === productId)
}

export function calculateCartSubtotal(items: readonly HomeCartItem[]) {
  const subtotalCents = items.reduce(
    (subtotal, item) => subtotal + Math.round(Number(item.product.price) * 100) * item.quantity,
    0
  )
  return subtotalCents / 100
}
