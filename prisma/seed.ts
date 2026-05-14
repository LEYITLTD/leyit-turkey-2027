import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const user = await prisma.user.upsert({
    where:  { email: 'nabilm@leyit.uk' },
    update: {},
    create: {
      email:     'nabilm@leyit.uk',
      password:  '$2b$12$hA63jevHm0/hD9XqO5zwreciVFQHT5PlOPB2zzmzmEZxlG3KYDRcm',
      name:      'Nabil M',
      role:      'BOTH',
      adminRole: 'Operations Lead',
    },
  })

  console.log(`✅ User created: ${user.email} (role: ${user.role})`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
