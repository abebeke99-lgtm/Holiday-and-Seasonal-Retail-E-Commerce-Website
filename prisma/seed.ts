import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const categories = [
    { name: 'Holiday Decor', slug: 'holiday-decor' },
    { name: 'Table & Hosting', slug: 'table-hosting' },
    { name: 'Gifts', slug: 'gifts' },
    { name: 'Seasonal Home', slug: 'seasonal-home' }
  ]
  for (const category of categories) {
    await prisma.category.upsert({ where: { slug: category.slug }, create: category, update: {} })
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD
  if (email && password) {
    if (password.length < 12) throw new Error('SEED_ADMIN_PASSWORD must contain at least 12 characters')
    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.upsert({
      where: { email },
      create: { email, name: 'SeasonMart Admin', passwordHash, role: 'ADMIN' },
      update: { role: 'ADMIN' }
    })
  }
}

main()
  .catch((error: unknown) => {
    console.error('Database seed failed:', error instanceof Error ? error.message : 'Unknown error')
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
