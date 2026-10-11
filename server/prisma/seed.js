import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create or get default club
  const club = await prisma.club.upsert({
    where: { slug: 'skyline-sa' },
    update: {},
    create: {
      name: 'Skyline Student Association',
      slug: 'skyline-sa',
      description:
        'The Skyline Student Association runs events, sells memberships and merchandise, and manages a small budget raised from dues, ticket sales and fundraisers.',
    },
  });

  console.log(`  ✅ Club: ${club.name} (${club.id})`);

  // 2. Create default membership plans
  const plans = [
    {
      clubId: club.id,
      name: 'Basic Membership',
      description: 'Access to member-only events and basic discounts',
      priceInPaise: 50000, // ₹500
      durationDays: 365,
      benefits: {
        ticketDiscount: 10,
        merchDiscount: 5,
        earlyAccess: false,
      },
      sortOrder: 1,
    },
    {
      clubId: club.id,
      name: 'Premium Membership',
      description: 'All Basic benefits plus premium discounts and early event access',
      priceInPaise: 100000, // ₹1,000
      durationDays: 365,
      benefits: {
        ticketDiscount: 20,
        merchDiscount: 15,
        earlyAccess: true,
      },
      sortOrder: 2,
    },
  ];

  let primaryPlan = null;
  for (const plan of plans) {
    const existing = await prisma.membershipPlan.findFirst({
      where: { clubId: club.id, name: plan.name },
    });
    if (existing) {
      primaryPlan = existing;
    } else {
      primaryPlan = await prisma.membershipPlan.create({ data: plan });
    }
    console.log(`  ✅ Plan: ${primaryPlan.name} (₹${primaryPlan.priceInPaise / 100})`);
  }

  // 3. Discount Rules
  const existingRule = await prisma.discountRule.findFirst({ where: { clubId: club.id } });
  if (!existingRule) {
    await prisma.discountRule.create({
      data: {
        clubId: club.id,
        name: 'Default Member Discount',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        appliesToTickets: true,
        appliesToMerch: true,
        appliesToMembership: false,
        requiresActiveMembership: true,
        minPurchaseInPaise: 0,
        pointsPerHundred: 1,
        pointValueInPaise: 100,
        minRedemptionPoints: 10,
        maxRedemptionPercent: 50,
        allowFullPointsCoverage: false,
        membersEarnPoints: true,
        stackDiscounts: false,
        earnOnPreDiscount: false,
        pointsExpiryDays: 365,
      },
    });
    console.log('  ✅ Discount Rule created');
  }

  // 4. Seed Demo Users
  const passwordHash = await argon2.hash('skyline123', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const demoUsers = [
    {
      email: 'admin@skyline.edu',
      firstName: 'Neha',
      lastName: 'Kulkarni',
      role: 'CLUB_ADMIN',
    },
    {
      email: 'em@skyline.edu',
      firstName: 'Sneha',
      lastName: 'Iyer',
      role: 'EVENT_MANAGER',
    },
    {
      email: 'vol@skyline.edu',
      firstName: 'Arjun',
      lastName: 'Mehta',
      role: 'VOLUNTEER',
    },
    {
      email: 'treasury@skyline.edu',
      firstName: 'Rohan',
      lastName: 'Gupta',
      role: 'TREASURER',
    },
    {
      email: 'root@skyline.edu',
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
    },
    {
      email: 'riya@student.edu',
      firstName: 'Riya',
      lastName: 'Sharma',
      role: 'MEMBER',
    },
    {
      email: 'aarav@student.edu',
      firstName: 'Aarav',
      lastName: 'Verma',
      role: 'MEMBER',
    },
  ];

  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, passwordHash },
      create: {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        passwordHash,
      },
    });

    // Ensure loyalty account exists
    await prisma.loyaltyAccount.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        balance: u.email === 'riya@student.edu' ? 340 : 0,
        lifetimeEarned: u.email === 'riya@student.edu' ? 620 : 0,
        lifetimeRedeemed: u.email === 'riya@student.edu' ? 280 : 0,
      },
    });

    // Active membership for Riya
    if (u.email === 'riya@student.edu' && primaryPlan) {
      const activeMem = await prisma.membership.findFirst({
        where: { userId: user.id, status: 'ACTIVE' },
      });
      if (!activeMem) {
        const start = new Date();
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        await prisma.membership.create({
          data: {
            userId: user.id,
            planId: primaryPlan.id,
            status: 'ACTIVE',
            startDate: start,
            expiryDate: expiry,
          },
        });
      }
    }

    console.log(`  ✅ User: ${user.email} (${user.role})`);
  }

  // 5. Seed Events
  const events = [
    {
      title: 'Annual Spring Gala 2026',
      description:
        'Our flagship night of the year — dinner, live band, DJ floor and the annual awards. Semi-formal. Plus-ones welcome at guest pricing.',
      location: 'Grand Ballroom, Student Center',
      startDate: new Date(Date.now() + 5 * 86400000),
      endDate: new Date(Date.now() + 5 * 86400000 + 4 * 3600000),
      capacity: 300,
      status: 'PUBLISHED',
      clubId: club.id,
      ticketTypes: [
        { name: 'Member Pass', priceInPaise: 40000, memberPriceInPaise: 40000, quantity: 150 },
        {
          name: 'General Admission',
          priceInPaise: 60000,
          memberPriceInPaise: 40000,
          quantity: 150,
        },
      ],
    },
    {
      title: 'Campus Open Mic Night',
      description:
        'Poetry, stand-up, acoustic sets and one very brave faculty guest. Free for members — bring your 3 minutes of courage.',
      location: 'Open Amphitheatre',
      startDate: new Date(Date.now() + 7 * 86400000),
      endDate: new Date(Date.now() + 7 * 86400000 + 3 * 3600000),
      capacity: 150,
      status: 'PUBLISHED',
      clubId: club.id,
      ticketTypes: [
        { name: 'Member Pass', priceInPaise: 0, memberPriceInPaise: 0, quantity: 100 },
        { name: 'Guest Ticket', priceInPaise: 10000, memberPriceInPaise: 0, quantity: 50 },
      ],
    },
    {
      title: 'HackSkyline 48-Hour Hackathon',
      description:
        '48 hours, 4 tracks, unlimited coffee. Teams of four build for campus life. Free for members; ₹150 for guests.',
      location: 'Innovation Lab, Block C',
      startDate: new Date(Date.now() + 20 * 86400000),
      endDate: new Date(Date.now() + 22 * 86400000),
      capacity: 120,
      status: 'PUBLISHED',
      clubId: club.id,
      ticketTypes: [
        { name: 'Hacker Pass (Member)', priceInPaise: 0, memberPriceInPaise: 0, quantity: 80 },
        { name: 'Guest Hacker Pass', priceInPaise: 15000, memberPriceInPaise: 0, quantity: 40 },
      ],
    },
  ];

  for (const evData of events) {
    const { ticketTypes, ...eDetails } = evData;
    const existing = await prisma.event.findFirst({
      where: { clubId: club.id, title: eDetails.title },
    });
    if (!existing) {
      await prisma.event.create({
        data: {
          ...eDetails,
          ticketTypes: {
            create: ticketTypes,
          },
        },
      });
      console.log(`  ✅ Event created: ${eDetails.title}`);
    }
  }

  // 6. Seed Merchandise Products
  const products = [
    {
      name: 'Summit Hoodie',
      description:
        'Heavyweight 320 GSM fleece, embroidered peak crest, kangaroo pocket. Runs true to size.',
      clubId: club.id,
      variants: [
        { name: 'S', sku: 'HOODIE-S', priceInPaise: 89900, memberPriceInPaise: 76400, stock: 14 },
        { name: 'M', sku: 'HOODIE-M', priceInPaise: 89900, memberPriceInPaise: 76400, stock: 8 },
        { name: 'L', sku: 'HOODIE-L', priceInPaise: 89900, memberPriceInPaise: 76400, stock: 22 },
        { name: 'XL', sku: 'HOODIE-XL', priceInPaise: 89900, memberPriceInPaise: 76400, stock: 6 },
      ],
    },
    {
      name: 'Crest Tee',
      description: 'Combed cotton, screen-printed crest, pre-shrunk. The everyday club uniform.',
      clubId: club.id,
      variants: [
        { name: 'S', sku: 'TEE-S', priceInPaise: 49900, memberPriceInPaise: 42400, stock: 20 },
        { name: 'M', sku: 'TEE-M', priceInPaise: 49900, memberPriceInPaise: 42400, stock: 31 },
        { name: 'L', sku: 'TEE-L', priceInPaise: 49900, memberPriceInPaise: 42400, stock: 18 },
      ],
    },
    {
      name: 'Field Cap',
      description: 'Washed cotton twill, adjustable strap, tonal peak mark on the front panel.',
      clubId: club.id,
      variants: [
        {
          name: 'One size',
          sku: 'CAP-OS',
          priceInPaise: 39900,
          memberPriceInPaise: 33900,
          stock: 26,
        },
      ],
    },
  ];

  for (const pData of products) {
    const { variants, ...prodDetails } = pData;
    const existing = await prisma.product.findFirst({
      where: { clubId: club.id, name: prodDetails.name },
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          ...prodDetails,
          variants: {
            create: variants,
          },
        },
      });
      console.log(`  ✅ Product created: ${prodDetails.name}`);
    }
  }

  // 7. Seed Fundraisers & Volunteer Tasks
  const existingFundraiser = await prisma.fundraiser.findFirst({ where: { clubId: club.id } });
  if (!existingFundraiser) {
    const fund = await prisma.fundraiser.create({
      data: {
        clubId: club.id,
        title: 'Winter Charity Bake Sale',
        description: 'Every rupee raised goes towards the student emergency book and tech fund.',
        targetInPaise: 5000000, // ₹50,000
        raisedInPaise: 3624000, // ₹36,240
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 86400000),
        tasks: {
          create: [
            {
              title: 'Bake 40 boxes of brownies',
              description: 'Nut-free brownies for bake sale stall 1',
              status: 'IN_PROGRESS',
            },
            {
              title: 'Buy packaging supplies',
              description: 'Paper bags and eco-friendly boxes',
              status: 'TODO',
            },
            {
              title: 'Design stall posters',
              description: 'Promotional posters for campus boards',
              status: 'COMPLETED',
            },
            {
              title: 'Staff the morning shift',
              description: 'Stall 2 morning coverage 9am - 12pm',
              status: 'TODO',
            },
          ],
        },
      },
    });
    console.log(`  ✅ Fundraiser created: ${fund.title}`);
  }

  // 8. Seed Announcements
  const existingAnn = await prisma.announcement.findFirst({ where: { clubId: club.id } });
  if (!existingAnn) {
    await prisma.announcement.createMany({
      data: [
        {
          clubId: club.id,
          title: 'Spring Gala tickets are live — 82% sold',
          content:
            'Member pricing applies at checkout automatically. Ticket desk at the venue will be QR-scan only — no printed lists, no cash. Download your ticket from My Tickets before you arrive.',
          isPublished: true,
          publishedAt: new Date(),
          audience: { category: 'Events', pinned: true },
        },
        {
          clubId: club.id,
          title: 'Volunteer drive: 14 crews confirmed, 3 slots left',
          content:
            'Crew allocations are up. Check the volunteer dashboard for your assignment, crew lead and meeting point. Breakfast boxes will be distributed at 9:30 AM at the Quad.',
          isPublished: true,
          publishedAt: new Date(),
          audience: { category: 'Volunteering', pinned: false },
        },
      ],
    });
    console.log('  ✅ Announcements created');
  }

  // 10. Seed Financial Transactions (Ledger)
  const existingTxns = await prisma.financialTransaction.count();
  if (existingTxns === 0) {
    const transactions = [
      {
        category: 'TICKET_INCOME',
        amountInPaise: 1920000,
        description: 'Spring Gala · 38 tickets (member + guest)',
        clubId: club.id,
        date: new Date(Date.now() - 1 * 86400000),
      },
      {
        category: 'MERCHANDISE_SALES',
        amountInPaise: 984500,
        description: 'Summit Hoodie + Crest Tee · 11 orders',
        clubId: club.id,
        date: new Date(Date.now() - 2 * 86400000),
      },
      {
        category: 'REIMBURSEMENT',
        amountInPaise: 124000,
        description: 'Hack weekend refreshments · Dev Patel',
        clubId: club.id,
        date: new Date(Date.now() - 3 * 86400000),
      },
      {
        category: 'MEMBERSHIP_DUES',
        amountInPaise: 1238200,
        description: '18 new + renewed memberships',
        clubId: club.id,
        date: new Date(Date.now() - 4 * 86400000),
      },
      {
        category: 'TICKET_INCOME',
        amountInPaise: 535000,
        description: 'Sunrise Trek · 19 tickets',
        clubId: club.id,
        date: new Date(Date.now() - 5 * 86400000),
      },
      {
        category: 'REIMBURSEMENT',
        amountInPaise: 34000,
        description: 'Stall posters & banners · Sneha Iyer',
        clubId: club.id,
        date: new Date(Date.now() - 6 * 86400000),
      },
      {
        category: 'FUNDRAISER_INCOME',
        amountInPaise: 420000,
        description: 'Winter Bake Sale · pre-orders',
        clubId: club.id,
        date: new Date(Date.now() - 7 * 86400000),
      },
      {
        category: 'EXPENSE',
        amountInPaise: 1500000,
        description: 'Gala venue advance payment · Student Center',
        clubId: club.id,
        date: new Date(Date.now() - 8 * 86400000),
      },
      {
        category: 'REFUND',
        amountInPaise: 40000,
        description: 'Refund · duplicate gala ticket #1042',
        clubId: club.id,
        date: new Date(Date.now() - 9 * 86400000),
      },
      {
        category: 'MERCHANDISE_SALES',
        amountInPaise: 517400,
        description: 'Field Notes Book + Tote · 26 orders',
        clubId: club.id,
        date: new Date(Date.now() - 10 * 86400000),
      },
      {
        category: 'TICKET_INCOME',
        amountInPaise: 310000,
        description: 'Campus Open Mic Night · 31 guest passes',
        clubId: club.id,
        date: new Date(Date.now() - 12 * 86400000),
      },
      {
        category: 'EXPENSE',
        amountInPaise: 450000,
        description: 'Sound equipment rental for Open Mic',
        clubId: club.id,
        date: new Date(Date.now() - 13 * 86400000),
      },
      {
        category: 'MEMBERSHIP_DUES',
        amountInPaise: 499900,
        description: 'Alumni Circle · 1 new member',
        clubId: club.id,
        date: new Date(Date.now() - 14 * 86400000),
      },
      {
        category: 'FUNDRAISER_INCOME',
        amountInPaise: 345000,
        description: 'Campus Book Swap & Charity Drive donations',
        clubId: club.id,
        date: new Date(Date.now() - 15 * 86400000),
      },
      {
        category: 'TICKET_INCOME',
        amountInPaise: 360000,
        description: 'HackSkyline Hackathon · 24 team registrations',
        clubId: club.id,
        date: new Date(Date.now() - 16 * 86400000),
      },
      {
        category: 'DONATION',
        amountInPaise: 1000000,
        description: 'Alumni Matching Donation for Lab Kit',
        clubId: club.id,
        date: new Date(Date.now() - 18 * 86400000),
      },
    ];

    await prisma.financialTransaction.createMany({
      data: transactions,
    });
    console.log(`  ✅ Financial Transactions (${transactions.length} records) created in Ledger`);
  }

  console.log('\n🎉 Comprehensive database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
