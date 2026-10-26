import { z } from 'zod'

export const registrationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(12).max(72).refine(password => Buffer.byteLength(password, 'utf8') <= 72)
})

export const cartItemSchema = z.object({
  productId: z.string().min(1).max(30),
  quantity: z.number().int().min(1).max(99)
})
