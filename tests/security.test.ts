import { describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import { registrationSchema } from '../server/utils/schemas'
import { calculateSubtotal } from '../server/utils/pricing'
import { Prisma } from '@prisma/client'

describe('registration input validation', () => {
  it('normalizes email and requires a strong password', () => {
    expect(registrationSchema.parse({
      name: '  Casey  ',
      email: 'CASEY@example.com',
      password: 'a-long-password-123'
    })).toEqual({
      name: 'Casey',
      email: 'casey@example.com',
      password: 'a-long-password-123'
    })
    expect(registrationSchema.safeParse({
      name: 'Casey',
      email: 'casey@example.com',
      password: 'short'
    }).success).toBe(false)
  })

  it('rejects passwords that exceed bcrypt input length in UTF-8', () => {
    expect(registrationSchema.safeParse({
      name: 'Casey',
      email: 'casey@example.com',
      password: 'é'.repeat(37)
    }).success).toBe(false)
  })
})

describe('password storage', () => {
  it('stores a bcrypt hash that verifies the original password', async () => {
    const password = 'a-long-password-123'
    const hash = await bcrypt.hash(password, 4)
    expect(hash).not.toBe(password)
    expect(await bcrypt.compare(password, hash)).toBe(true)
    expect(await bcrypt.compare('incorrect-password', hash)).toBe(false)
  })
})

describe('checkout pricing', () => {
  it('calculates exact decimal totals from database prices and quantities', () => {
    const total = calculateSubtotal([
      { price: new Prisma.Decimal('12.35'), quantity: 3 },
      { price: new Prisma.Decimal('0.10'), quantity: 2 }
    ])
    expect(total.toFixed(2)).toBe('37.25')
  })
})
