import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { hash } from 'bcryptjs'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  // Create admin user
  const adminPassword = await hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
    },
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  // Create member user with budget
  const memberPassword = await hash('member123', 12)
  const member = await prisma.user.upsert({
    where: { email: 'member@example.com' },
    update: {
      name: 'John Member',
      password: memberPassword,
      role: 'MEMBER',
      totalBudget: 5000,
    },
    create: {
      email: 'member@example.com',
      name: 'John Member',
      password: memberPassword,
      role: 'MEMBER',
      totalBudget: 5000, // Monthly budget allocation
    },
  })

  // Create sample expenses
  await prisma.expense.createMany({
    data: [
      {
        title: 'Business Lunch',
        description: 'Client meeting lunch',
        amount: 85.50,
        category: 'FOOD',
        status: 'PENDING',
        createdById: member.id,
      },
      {
        title: 'Taxi to Airport',
        description: 'Business trip transportation',
        amount: 45.00,
        category: 'FREIGHT',
        status: 'APPROVED',
        createdById: member.id,
      },
      {
        title: 'Hotel Stay',
        description: 'Conference hotel',
        amount: 250.00,
        category: 'HOTEL',
        status: 'PENDING',
        createdById: member.id,
      },
    ],
    skipDuplicates: true,
  })

  console.log('Seed completed!')
  console.log('Admin user: admin@example.com / admin123')
  console.log('Member user: member@example.com / member123')

}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
