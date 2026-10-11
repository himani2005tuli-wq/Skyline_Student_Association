import argon2 from 'argon2';
import prisma from '../config/database.js';
import logger from '../utils/logger.js';

export async function ensureRoleAccounts() {
  try {
    const passwordHash = await argon2.hash('skyline123', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // 1. Ensure Default Club
    const club = await prisma.club.upsert({
      where: { slug: 'skyline-sa' },
      update: {},
      create: {
        name: 'Skyline Student Association',
        slug: 'skyline-sa',
        description: 'The premier student organization managing events, memberships, and campus initiatives.',
      },
    });

    // 2. Ensure Membership Plans
    const plansData = [
      {
        name: 'Basic Membership',
        description: 'Semester pass with discounts on tickets and merch',
        priceInPaise: 49900,
        durationDays: 120,
        sortOrder: 1,
        benefits: { ticketDiscount: 15, merchDiscount: 10, earlyAccess: false },
      },
      {
        name: 'Annual Membership',
        description: 'Full academic year access with priority booking and perks',
        priceInPaise: 99900,
        durationDays: 365,
        sortOrder: 2,
        benefits: { ticketDiscount: 25, merchDiscount: 15, earlyAccess: true },
      },
      {
        name: 'Alumni & Lifetime Circle',
        description: 'Lifetime club patron membership with maximum privileges',
        priceInPaise: 499900,
        durationDays: 3650,
        sortOrder: 3,
        benefits: { ticketDiscount: 30, merchDiscount: 20, earlyAccess: true },
      },
    ];

    let primaryPlan = null;
    for (const p of plansData) {
      let plan = await prisma.membershipPlan.findFirst({
        where: { clubId: club.id, name: p.name },
      });
      if (!plan) {
        plan = await prisma.membershipPlan.create({
          data: { ...p, clubId: club.id },
        });
      }
      if (!primaryPlan) primaryPlan = plan;
    }

    // 3. Ensure 12 Active Users (~10 members and key officers)
    const usersData = [
      { email: 'superadmin@skyline.edu', firstName: 'Platform', lastName: 'Admin', role: 'SUPER_ADMIN' },
      { email: 'root@skyline.edu', firstName: 'Root', lastName: 'Admin', role: 'SUPER_ADMIN' },
      { email: 'admin@skyline.edu', firstName: 'Neha', lastName: 'Kulkarni', role: 'CLUB_ADMIN' },
      { email: 'treasurer@skyline.edu', firstName: 'Rohan', lastName: 'Gupta', role: 'TREASURER' },
      { email: 'treasury@skyline.edu', firstName: 'Rohan', lastName: 'Gupta', role: 'TREASURER' },
      { email: 'eventmanager@skyline.edu', firstName: 'Sneha', lastName: 'Iyer', role: 'EVENT_MANAGER' },
      { email: 'em@skyline.edu', firstName: 'Sneha', lastName: 'Iyer', role: 'EVENT_MANAGER' },
      { email: 'volunteer@skyline.edu', firstName: 'Arjun', lastName: 'Mehta', role: 'VOLUNTEER' },
      { email: 'vol@skyline.edu', firstName: 'Arjun', lastName: 'Mehta', role: 'VOLUNTEER' },
      { email: 'member@skyline.edu', firstName: 'Riya', lastName: 'Sharma', role: 'MEMBER' },
      { email: 'riya@student.edu', firstName: 'Riya', lastName: 'Sharma', role: 'MEMBER' },
      { email: 'aarav@student.edu', firstName: 'Aarav', lastName: 'Verma', role: 'MEMBER' },
      { email: 'tanvi@student.edu', firstName: 'Tanvi', lastName: 'Deshmukh', role: 'MEMBER' },
      { email: 'kabir@student.edu', firstName: 'Kabir', lastName: 'Mehta', role: 'MEMBER' },
      { email: 'ananya@student.edu', firstName: 'Ananya', lastName: 'Sen', role: 'MEMBER' },
      { email: 'dev@student.edu', firstName: 'Dev', lastName: 'Patel', role: 'MEMBER' },
    ];

    const userMap = {};
    for (const u of usersData) {
      const user = await prisma.user.upsert({
        where: { email: u.email },
        update: { role: u.role, passwordHash, emailVerified: true, isActive: true },
        create: {
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          passwordHash,
          emailVerified: true,
          isActive: true,
        },
      });
      userMap[u.email] = user;

      // Loyalty account
      await prisma.loyaltyAccount.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          balance: u.role === 'MEMBER' ? 340 : 100,
          lifetimeEarned: u.role === 'MEMBER' ? 620 : 250,
          lifetimeRedeemed: u.role === 'MEMBER' ? 280 : 150,
        },
      });

      // Active Membership
      if (u.role === 'MEMBER' && primaryPlan) {
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
    }

    // 4. Ensure 10 Realistic Events
    const eventsList = [
      {
        title: 'Annual Spring Gala 2026',
        description: 'Our flagship night of the year — dinner, live band, DJ floor and the annual awards. Semi-formal dress code.',
        location: 'Grand Ballroom, Student Center',
        capacity: 350,
        startDate: new Date(Date.now() + 5 * 86400000),
        endDate: new Date(Date.now() + 5 * 86400000 + 4 * 3600000),
        tickets: [
          { name: 'Member Pass', priceInPaise: 40000, memberPriceInPaise: 40000, quantity: 180 },
          { name: 'Guest Pass', priceInPaise: 60000, memberPriceInPaise: 40000, quantity: 170 },
        ],
      },
      {
        title: 'Campus Open Mic Night',
        description: 'Poetry, stand-up comedy, acoustic sets and student musical duos. Free entry for members.',
        location: 'Open Amphitheatre',
        capacity: 150,
        startDate: new Date(Date.now() + 8 * 86400000),
        endDate: new Date(Date.now() + 8 * 86400000 + 3 * 3600000),
        tickets: [
          { name: 'Member Pass', priceInPaise: 0, memberPriceInPaise: 0, quantity: 100 },
          { name: 'Guest Ticket', priceInPaise: 10000, memberPriceInPaise: 0, quantity: 50 },
        ],
      },
      {
        title: 'HackSkyline 48-Hour Hackathon',
        description: '48 hours, 4 challenge tracks, unlimited energy drinks. Teams build impactful software for campus life.',
        location: 'Innovation Lab, Block C',
        capacity: 120,
        startDate: new Date(Date.now() + 14 * 86400000),
        endDate: new Date(Date.now() + 16 * 86400000),
        tickets: [
          { name: 'Hacker Pass (Member)', priceInPaise: 0, memberPriceInPaise: 0, quantity: 80 },
          { name: 'Guest Hacker Pass', priceInPaise: 15000, memberPriceInPaise: 0, quantity: 40 },
        ],
      },
      {
        title: 'Sunrise Ridge Trek & Camp',
        description: '6 km pre-dawn hike to Skyline Point, breakfast on the ridge, and stunning panoramic views.',
        location: 'Meet at East Gate Bus Stop',
        capacity: 60,
        startDate: new Date(Date.now() + 12 * 86400000),
        endDate: new Date(Date.now() + 12 * 86400000 + 6 * 3600000),
        tickets: [
          { name: 'Member Trekker', priceInPaise: 25000, memberPriceInPaise: 25000, quantity: 35 },
          { name: 'Guest Trekker', priceInPaise: 35000, memberPriceInPaise: 25000, quantity: 25 },
        ],
      },
      {
        title: 'Winter Esports Tournament (Valorant & FC25)',
        description: 'High-octane collegiate esports showdown with live caster stream, prize pool and spectator arena.',
        location: 'Seminar Hall 2, Tech Hub',
        capacity: 200,
        startDate: new Date(Date.now() + 18 * 86400000),
        endDate: new Date(Date.now() + 18 * 86400000 + 5 * 3600000),
        tickets: [
          { name: 'Spectator Entry', priceInPaise: 5000, memberPriceInPaise: 0, quantity: 150 },
          { name: 'Team Registration', priceInPaise: 50000, memberPriceInPaise: 40000, quantity: 50 },
        ],
      },
      {
        title: 'Product Design & UI Masterclass',
        description: 'Interactive Figma design sprint hosted by industry designers. Learn wireframing, typography and systems.',
        location: 'Design Studio B-12',
        capacity: 50,
        startDate: new Date(Date.now() + 22 * 86400000),
        endDate: new Date(Date.now() + 22 * 86400000 + 3 * 3600000),
        tickets: [
          { name: 'Workshop Pass', priceInPaise: 20000, memberPriceInPaise: 10000, quantity: 50 },
        ],
      },
      {
        title: 'Annual Career & Startup Fair',
        description: 'Connect with over 25 visiting startup founders, recruiters, and alumni working across top tech companies.',
        location: 'Central Sports Complex Arena',
        capacity: 500,
        startDate: new Date(Date.now() + 28 * 86400000),
        endDate: new Date(Date.now() + 28 * 86400000 + 7 * 3600000),
        tickets: [
          { name: 'Student Entry', priceInPaise: 0, memberPriceInPaise: 0, quantity: 500 },
        ],
      },
      {
        title: 'Inter-College Battle of Bands',
        description: 'Eight student rock and indie bands face off on the amphitheatre stage for the rolling university trophy.',
        location: 'Main University Amphitheatre',
        capacity: 400,
        startDate: new Date(Date.now() + 35 * 86400000),
        endDate: new Date(Date.now() + 35 * 86400000 + 4 * 3600000),
        tickets: [
          { name: 'Early Bird Ticket', priceInPaise: 15000, memberPriceInPaise: 10000, quantity: 200 },
          { name: 'Standard Pass', priceInPaise: 25000, memberPriceInPaise: 15000, quantity: 200 },
        ],
      },
      {
        title: 'Badminton Doubles Smash League',
        description: 'Campus recreational badminton tournament. Shuttlecocks provided, medals and merchandise prizes.',
        location: 'Indoor Badminton Pavilion',
        capacity: 64,
        startDate: new Date(Date.now() + 40 * 86400000),
        endDate: new Date(Date.now() + 40 * 86400000 + 6 * 3600000),
        tickets: [
          { name: 'Doubles Team Entry', priceInPaise: 30000, memberPriceInPaise: 20000, quantity: 32 },
        ],
      },
      {
        title: 'Alumni Mixer & Networking Dinner',
        description: 'An evening of informal mentoring, memories, and career guidance with alumni graduating from 2019-2025.',
        location: 'Skyline Terrace Lounge',
        capacity: 100,
        startDate: new Date(Date.now() + 45 * 86400000),
        endDate: new Date(Date.now() + 45 * 86400000 + 3 * 3600000),
        tickets: [
          { name: 'Student Seat', priceInPaise: 30000, memberPriceInPaise: 20000, quantity: 50 },
          { name: 'Alumni Ticket', priceInPaise: 50000, memberPriceInPaise: 50000, quantity: 50 },
        ],
      },
    ];

    const createdEvents = [];
    for (const ev of eventsList) {
      let event = await prisma.event.findFirst({
        where: { clubId: club.id, title: ev.title },
        include: { ticketTypes: true },
      });
      if (!event) {
        event = await prisma.event.create({
          data: {
            clubId: club.id,
            title: ev.title,
            description: ev.description,
            location: ev.location,
            capacity: ev.capacity,
            startDate: ev.startDate,
            endDate: ev.endDate,
            status: 'PUBLISHED',
            ticketTypes: {
              create: ev.tickets,
            },
          },
          include: { ticketTypes: true },
        });
      }
      createdEvents.push(event);
    }

    // 5. Ensure 10 Merchandise Products
    const productsList = [
      {
        name: 'Summit Heavyweight Hoodie',
        description: '320 GSM brushed fleece with embroidered mountain crest, metal-tipped drawstrings, and front kangaroo pouch.',
        variants: [
          { name: 'S', sku: 'HOODIE-BLK-S', priceInPaise: 89900, memberPriceInPaise: 76400, stock: 15 },
          { name: 'M', sku: 'HOODIE-BLK-M', priceInPaise: 89900, memberPriceInPaise: 76400, stock: 24 },
          { name: 'L', sku: 'HOODIE-BLK-L', priceInPaise: 89900, memberPriceInPaise: 76400, stock: 18 },
          { name: 'XL', sku: 'HOODIE-BLK-XL', priceInPaise: 89900, memberPriceInPaise: 76400, stock: 9 },
        ],
      },
      {
        name: 'Classic Crest T-Shirt',
        description: '100% combed organic cotton, vintage screenprint, relaxed fit. The daily club staple.',
        variants: [
          { name: 'S', sku: 'TEE-WHT-S', priceInPaise: 49900, memberPriceInPaise: 42400, stock: 25 },
          { name: 'M', sku: 'TEE-WHT-M', priceInPaise: 49900, memberPriceInPaise: 42400, stock: 32 },
          { name: 'L', sku: 'TEE-WHT-L', priceInPaise: 49900, memberPriceInPaise: 42400, stock: 20 },
        ],
      },
      {
        name: 'Heritage Field Cap',
        description: 'Washed cotton twill with antique brass closure and subtle tonal peak badge embroidery.',
        variants: [
          { name: 'One size', sku: 'CAP-NAVY-OS', priceInPaise: 39900, memberPriceInPaise: 33900, stock: 30 },
        ],
      },
      {
        name: 'Heavyweight Canvas Tote Bag',
        description: 'Durable 16 oz cotton canvas with reinforced cross-stitched handles and internal key clasp pocket.',
        variants: [
          { name: 'Standard', sku: 'TOTE-NAT-STD', priceInPaise: 29900, memberPriceInPaise: 24900, stock: 45 },
        ],
      },
      {
        name: 'Insulated Stainless Steel Bottle (750ml)',
        description: 'Double-walled vacuum flask keeping drinks icy cold for 24 hours or steaming hot for 12 hours.',
        variants: [
          { name: '750ml', sku: 'BOTTLE-MATTE-750', priceInPaise: 59900, memberPriceInPaise: 49900, stock: 28 },
        ],
      },
      {
        name: 'Collectible Enamel Pin Badge Pack',
        description: 'Set of 4 collector hard-enamel pins with butterfly clasps celebrating Skyline tradition.',
        variants: [
          { name: 'Set of 4', sku: 'PIN-SET-4', priceInPaise: 19900, memberPriceInPaise: 14900, stock: 60 },
        ],
      },
      {
        name: 'Padded Laptop Sleeve (13"-15")',
        description: 'Water-resistant ripstop exterior with plush microfiber lining and front accessory zipper.',
        variants: [
          { name: '13-14 inch', sku: 'SLEEVE-14', priceInPaise: 64900, memberPriceInPaise: 54900, stock: 16 },
          { name: '15-16 inch', sku: 'SLEEVE-16', priceInPaise: 69900, memberPriceInPaise: 58900, stock: 12 },
        ],
      },
      {
        name: 'Stoneware Club Coffee Mug',
        description: '14 oz matte black ceramic mug with debossed emblem and ergonomic grip handle.',
        variants: [
          { name: '14 oz', sku: 'MUG-BLK-14', priceInPaise: 24900, memberPriceInPaise: 19900, stock: 40 },
        ],
      },
      {
        name: 'Varsity Bomber Jacket',
        description: 'Wool-blend body with vegan leather sleeves, striped rib-knit trim, and internal quilted lining.',
        variants: [
          { name: 'M', sku: 'VARSITY-M', priceInPaise: 249900, memberPriceInPaise: 219900, stock: 7 },
          { name: 'L', sku: 'VARSITY-L', priceInPaise: 249900, memberPriceInPaise: 219900, stock: 11 },
          { name: 'XL', sku: 'VARSITY-XL', priceInPaise: 249900, memberPriceInPaise: 219900, stock: 5 },
        ],
      },
      {
        name: 'Ribbed Knit Beanie',
        description: 'Soft recycled acrylic rib knit with folded cuff and woven label. Stretchy, warm, unisex.',
        variants: [
          { name: 'One size', sku: 'BEANIE-CHAR-OS', priceInPaise: 34900, memberPriceInPaise: 29900, stock: 35 },
        ],
      },
    ];

    const createdVariants = [];
    for (const prod of productsList) {
      let p = await prisma.product.findFirst({
        where: { clubId: club.id, name: prod.name },
        include: { variants: true },
      });
      if (!p) {
        p = await prisma.product.create({
          data: {
            clubId: club.id,
            name: prod.name,
            description: prod.description,
            variants: {
              create: prod.variants,
            },
          },
          include: { variants: true },
        });
      }
      if (p.variants) createdVariants.push(...p.variants);
    }

    // 6. Ensure 10 Announcements
    const announcementsList = [
      {
        title: 'Spring Gala tickets are live — 82% capacity reached',
        content: 'Member pricing applies at checkout automatically. Door admission is QR-scan only — please save your digital ticket before arriving.',
        audience: { category: 'Events', pinned: true },
      },
      {
        title: 'Treasury Transparency: Q1 Financial Ledger published',
        content: 'All dues, event revenues, and volunteer reimbursements from the past quarter have been reconciled and audited for full member visibility.',
        audience: { category: 'Finance', pinned: true },
      },
      {
        title: 'Volunteer drive: 14 crews confirmed, 3 slots left',
        content: 'Crew allocations are finalized. Check your volunteer workspace for your assigned shift, lead coordinator, and check-in station.',
        audience: { category: 'Volunteering', pinned: false },
      },
      {
        title: 'New Winter Merchandise Collection is now live in store',
        content: 'Summit Heavyweight Hoodies and Ribbed Beanies have landed in stock with exclusive 15% discount for verified club members.',
        audience: { category: 'Merchandise', pinned: false },
      },
      {
        title: 'HackSkyline 2026: Official challenge tracks announced',
        content: 'Four competitive tracks: AI in Campus Life, Sustainability, Student Finance, and Smart Campus. Registration closes midnight next Friday.',
        audience: { category: 'Tech', pinned: false },
      },
      {
        title: 'Auditions open for Campus Open Mic Night performances',
        content: 'Poetry, acoustic musical sets, and comedy slots available. Sign up with the Culture Crew coordinators at the Amphitheatre.',
        audience: { category: 'Culture', pinned: false },
      },
      {
        title: 'Student Emergency Tech & Book Fund reaches ₹72,500',
        content: 'Thanks to student donors and bake sale proceeds, we have funded 12 refurbished laptops for community student aid.',
        audience: { category: 'Fundraiser', pinned: false },
      },
      {
        title: 'Annual General Body Meeting scheduled for November 20th',
        content: 'Constitution updates, budget review, and executive committee elections will take place in the Student Union Auditorium.',
        audience: { category: 'Governance', pinned: true },
      },
      {
        title: 'Badminton Doubles League player registrations closing soon',
        content: 'Last 6 team slots remain open for the weekend smash tournament. Rackets available for loan from the sports counter.',
        audience: { category: 'Sports', pinned: false },
      },
      {
        title: 'Welcome new members: Kit collection at Union Desk B',
        content: 'New annual subscribers can collect their member pin badge, handbook, and access lanyard anytime between 10am and 4pm daily.',
        audience: { category: 'General', pinned: false },
      },
    ];

    for (const ann of announcementsList) {
      const existing = await prisma.announcement.findFirst({
        where: { clubId: club.id, title: ann.title },
      });
      if (!existing) {
        await prisma.announcement.create({
          data: {
            clubId: club.id,
            title: ann.title,
            content: ann.content,
            audience: ann.audience,
            isPublished: true,
            publishedAt: new Date(),
          },
        });
      }
    }

    // 7. Ensure Fundraisers & 10 Volunteer Tasks
    let fundraiser = await prisma.fundraiser.findFirst({
      where: { clubId: club.id, title: 'Winter Charity Bake Sale & Tech Drive' },
    });
    if (!fundraiser) {
      fundraiser = await prisma.fundraiser.create({
        data: {
          clubId: club.id,
          title: 'Winter Charity Bake Sale & Tech Drive',
          description: 'Raising funds for student emergency laptop grants and community library study kits.',
          targetInPaise: 10000000,
          raisedInPaise: 7250000,
          startDate: new Date(),
          endDate: new Date(Date.now() + 21 * 86400000),
          isActive: true,
        },
      });
    }

    const tasksList = [
      { title: 'Bake 40 boxes of walnut brownies', status: 'COMPLETED' },
      { title: 'Purchase compostable packaging supplies', status: 'COMPLETED' },
      { title: 'Print promotional campus flyers', status: 'COMPLETED' },
      { title: 'Set up audio speakers and banner at central quad', status: 'IN_PROGRESS' },
      { title: 'Staff the morning shift at bake sale stall 1', status: 'IN_PROGRESS' },
      { title: 'Receive and inventory donated laptops', status: 'IN_PROGRESS' },
      { title: 'Install fresh OS and diagnostic software on laptops', status: 'TODO' },
      { title: 'Review student aid grant applications', status: 'TODO' },
      { title: 'Audit and reconcile UPI collections with treasury', status: 'TODO' },
      { title: 'Distribute study kits to recipient scholarship students', status: 'TODO' },
    ];

    for (const t of tasksList) {
      const existingTask = await prisma.volunteerTask.findFirst({
        where: { fundraiserId: fundraiser.id, title: t.title },
      });
      if (!existingTask) {
        await prisma.volunteerTask.create({
          data: {
            fundraiserId: fundraiser.id,
            title: t.title,
            description: `Volunteer duty for ${fundraiser.title}`,
            status: t.status,
            deadline: new Date(Date.now() + 7 * 86400000),
          },
        });
      }
    }

    // 8. Ensure 10 Expenses & Reimbursements
    const volunteerUser = userMap['volunteer@skyline.edu'] || userMap['member@skyline.edu'];
    if (volunteerUser) {
      const expensesList = [
        { description: 'Hackathon pizza boxes & energy drinks', amountInPaise: 485000, status: 'PAID' },
        { description: 'Vinyl event banner & poster printing', amountInPaise: 145000, status: 'PAID' },
        { description: 'Microphone stands & XLR audio cables', amountInPaise: 85000, status: 'APPROVED' },
        { description: 'Bake sale organic butter & baking flour', amountInPaise: 260000, status: 'APPROVED' },
        { description: 'First-aid kit replenishment for ridge trek', amountInPaise: 65000, status: 'APPROVED' },
        { description: 'Trophy engraving for Esports tournament', amountInPaise: 120000, status: 'UNDER_REVIEW' },
        { description: 'Guest speaker hospitality conveyance', amountInPaise: 320000, status: 'UNDER_REVIEW' },
        { description: 'Spotlight bulbs & heavy duty extension cables', amountInPaise: 95000, status: 'SUBMITTED' },
        { description: 'Emergency mineral water packs for sports day', amountInPaise: 45000, status: 'SUBMITTED' },
        { description: 'Cab receipt without business GST invoice', amountInPaise: 55000, status: 'REJECTED', rejectionReason: 'Valid tax invoice required for reimbursement' },
      ];

      for (const exp of expensesList) {
        const existingExp = await prisma.expense.findFirst({
          where: { userId: volunteerUser.id, description: exp.description },
        });
        if (!existingExp) {
          await prisma.expense.create({
            data: {
              userId: volunteerUser.id,
              clubId: club.id,
              description: exp.description,
              amountInPaise: exp.amountInPaise,
              status: exp.status,
              rejectionReason: exp.rejectionReason || null,
            },
          });
        }
      }
    }

    // 9. Ensure 10 Event Bookings & Valid Tickets
    const riya = userMap['member@skyline.edu'] || userMap['riya@student.edu'];
    if (riya && createdEvents.length > 0) {
      for (let i = 0; i < Math.min(10, createdEvents.length); i++) {
        const ev = createdEvents[i];
        const tt = ev.ticketTypes && ev.ticketTypes[0];
        if (tt) {
          const bookingCode = `TKT-${ev.title.slice(0, 4).toUpperCase()}-${1000 + i}`;
          const existingTicket = await prisma.ticket.findUnique({
            where: { code: bookingCode },
          });

          if (!existingTicket) {
            const booking = await prisma.booking.create({
              data: {
                userId: riya.id,
                eventId: ev.id,
                ticketTypeId: tt.id,
                quantity: 1,
                status: 'CONFIRMED',
                totalInPaise: tt.memberPriceInPaise ?? tt.priceInPaise,
                discountInPaise: 0,
                tickets: {
                  create: [
                    {
                      code: bookingCode,
                      status: i % 3 === 0 ? 'USED' : 'VALID',
                    },
                  ],
                },
              },
            });
          }
        }
      }
    }

    // 10. Ensure 10 Merchandise Orders
    if (riya && createdVariants.length > 0) {
      for (let i = 0; i < Math.min(10, createdVariants.length); i++) {
        const variant = createdVariants[i];
        const existingOrder = await prisma.order.findFirst({
          where: {
            userId: riya.id,
            items: { some: { variantId: variant.id } },
          },
        });

        if (!existingOrder) {
          const qty = (i % 2) + 1;
          const unitPrice = variant.memberPriceInPaise ?? variant.priceInPaise;
          await prisma.order.create({
            data: {
              userId: riya.id,
              status: i % 4 === 0 ? 'FULFILLED' : i % 2 === 0 ? 'PROCESSING' : 'PAID',
              totalInPaise: unitPrice * qty,
              discountInPaise: 0,
              items: {
                create: [
                  {
                    variantId: variant.id,
                    quantity: qty,
                    unitPriceInPaise: unitPrice,
                    totalInPaise: unitPrice * qty,
                  },
                ],
              },
            },
          });
        }
      }
    }

    logger.info('✅ Successfully verified ~10 real records across all entities in Neon PostgreSQL');
  } catch (err) {
    logger.warn({ err }, '⚠️ Could not complete extensive seed');
  }
}
