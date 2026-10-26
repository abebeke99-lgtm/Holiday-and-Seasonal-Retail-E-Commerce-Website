import { describe, expect, it } from 'vitest'
import { calculateCartSubtotal, findWishlistItem } from '../app/utils/home-commerce'

describe('homepage shopping helpers', () => {
  it('calculates the displayed cart subtotal in cents', () => {
    expect(calculateCartSubtotal([
      { product: { price: '12.35' }, quantity: 3 },
      { product: { price: '0.10' }, quantity: 2 }
    ])).toBe(37.25)
  })

  it('finds only the wishlist item matching a product id', () => {
    const saved = { id: 'wishlist-item', productId: 'product-1' }
    expect(findWishlistItem([saved], 'product-1')).toBe(saved)
    expect(findWishlistItem([saved], 'product-2')).toBeUndefined()
  })
})
