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

export const adminUserCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().trim().toLowerCase(),
  password: registrationSchema.shape.password,
  role: z.enum(['CUSTOMER', 'STORE_MANAGER', 'ADMIN']).default('CUSTOMER')
})

export const adminUserUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.email().trim().toLowerCase().optional(),
  role: z.enum(['CUSTOMER', 'STORE_MANAGER', 'ADMIN']).optional(),
  active: z.boolean().optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one user field must be provided'
})
