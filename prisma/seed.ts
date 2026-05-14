import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Admin user ────────────────────────────────────────────────────────────
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
  console.log(`✅ User: ${user.email} (${user.role})`)

  // ─── Room types ────────────────────────────────────────────────────────────
  // Source: BookingEngine_Combined_Plan.docx — B.2.1 Room Inventory
  // IDs are stable slugs used in booking records and exports
  const rooms = [
    {
      id:             'superior_sea',
      displayName:    'Superior Room (Sea View)',
      category:       'SUPERIOR' as const,
      view:           'SEA' as const,
      description:    'Comes with 1 double bed. Sea-view balcony.',
      totalInventory: 25,
      maxAdults:      2,
      maxTotalPeople: 4,
      addBedAllowed:  false,
      addCotAllowed:  true,
      bothAllowed:    false,
      isSeaview:      true,
      isBundle:       false,
      bookableOnline: true,
    },
    {
      id:             'superior_forest',
      displayName:    'Superior Room (Forest View)',
      category:       'SUPERIOR' as const,
      view:           'FOREST' as const,
      description:    'Comes with 1 double bed. Forest-view balcony.',
      totalInventory: 55,
      maxAdults:      2,
      maxTotalPeople: 4,
      addBedAllowed:  false,
      addCotAllowed:  true,
      bothAllowed:    false,
      isSeaview:      false,
      isBundle:       false,
      bookableOnline: true,
    },
    {
      id:             'superior_accessible',
      displayName:    'Superior Room (Accessible)',
      category:       'SUPERIOR' as const,
      view:           'ACCESSIBLE' as const,
      description:    'Accessible room. Call to book.',
      totalInventory: 5,
      maxAdults:      2,
      maxTotalPeople: 4,
      addBedAllowed:  false,
      addCotAllowed:  true,
      bothAllowed:    false,
      isSeaview:      false,
      isBundle:       false,
      bookableOnline: false, // call to book only
    },
    {
      id:             'family_sea',
      displayName:    'Family Room (Sea View)',
      category:       'FAMILY' as const,
      view:           'SEA' as const,
      description:    'Double + single + sofa chair. Sea-view balcony. Suitable for children up to age 11.',
      totalInventory: 50,
      maxAdults:      2,
      maxTotalPeople: 6,
      addBedAllowed:  false,
      addCotAllowed:  true,
      bothAllowed:    false,
      isSeaview:      true,
      isBundle:       false,
      bookableOnline: true,
    },
    {
      id:             'family_forest',
      displayName:    'Family Room (Forest View)',
      category:       'FAMILY' as const,
      view:           'FOREST' as const,
      description:    'Double + single + sofa chair. Forest-view balcony. Suitable for children up to age 11.',
      totalInventory: 192,
      maxAdults:      2,
      maxTotalPeople: 6,
      addBedAllowed:  false,
      addCotAllowed:  true,
      bothAllowed:    false,
      isSeaview:      false,
      isBundle:       false,
      bookableOnline: true,
    },
    {
      id:             'suite_sea',
      displayName:    'Family Suite (Sea View)',
      category:       'SUITE' as const,
      view:           'SEA' as const,
      description:    'Double + 2 singles. Sea-view terrace. Extra bed and cot both available.',
      totalInventory: 3,
      maxAdults:      4,
      maxTotalPeople: 8,
      addBedAllowed:  true,
      addCotAllowed:  true,
      bothAllowed:    true,
      isSeaview:      true,
      isBundle:       false,
      bookableOnline: true,
    },
    {
      id:             'suite_forest',
      displayName:    'Family Suite (Forest View)',
      category:       'SUITE' as const,
      view:           'FOREST' as const,
      description:    'Double + 2 singles. Forest-view terrace. Extra bed and cot both available.',
      totalInventory: 20,
      maxAdults:      4,
      maxTotalPeople: 8,
      addBedAllowed:  true,
      addCotAllowed:  true,
      bothAllowed:    true,
      isSeaview:      false,
      isBundle:       false,
      bookableOnline: true,
    },
  ]

  for (const room of rooms) {
    await prisma.roomType.upsert({
      where:  { id: room.id },
      update: room,
      create: room,
    })
  }
  console.log(`✅ ${rooms.length} room types seeded`)

  // ─── Pricing config ────────────────────────────────────────────────────────
  // ⚠️  PLACEHOLDER RATES — these are 2026 values.
  //     Update via admin panel when 2027 rates are confirmed.
  //     All amounts in pence (£1 = 100).
  await prisma.pricingConfig.upsert({
    where:  { id: 'active' },
    update: {
      updatedBy: 'seed',
    },
    create: {
      id:                      'active',
      nights:                  4,

      // Standard rates (pence per night)
      rateAdultDoublePerNight: 12875,  // £128.75 — 2 or more adults
      rateAdultSinglePerNight: 25750,  // £257.50 — 1 adult (double rate)
      rateInfantPerNight:      1000,   // £10.00  — age 0–3
      rateChild46First:        4000,   // £40.00  — first child age 4–6 (total for stay)
      rateChild46Extra:        22000,  // £220.00 — each additional child age 4–6
      rateChild711PerNight:    5500,   // £55.00  — age 7–11 per night

      // Sea view supplement — flat, applied once
      seaviewSupplement:       5000,   // £50.00

      // Bundle rates (pence per night — lower than standard)
      bundleRateAdultDouble:   11875,  // £118.75
      bundleRateChild711Night: 5000,   // £50.00
      bundleRateChild46Extra:  20000,  // £200.00

      // Bundle discount — always applied on top of bundle rates
      bundleDiscountPercent:   20,

      isActive:                true,
      updatedBy:               'seed',
    },
  })
  console.log('✅ Pricing config seeded (2026 placeholder rates)')
  console.log('⚠️  Remember to update rates via admin panel when 2027 prices are confirmed')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
