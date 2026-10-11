import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import crypto from 'crypto';

const prisma = new PrismaClient();

// High-quality unsplash image assets
const CLUB_LOGOS = [
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
];

const EVENT_POSTERS = [
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=800&q=80',
];

const PRODUCT_IMAGES = [
  'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?auto=format&fit=crop&w=600&q=80',
];

async function seed() {
  console.log('🚀 Starting 50-records-per-table seeding script...');

  // 1. Password Hash
  const passwordHash = await argon2.hash('skyline123', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  // ──────────────────────────────────────────────────────────
  // 1. CLUBS (Seed >= 50 clubs)
  // ──────────────────────────────────────────────────────────
  console.log('🏢 Seeding Clubs...');
  const clubDefinitions = [
    { name: 'Skyline Student Association', slug: 'skyline-sa', desc: 'Central student governing union representing all campus chapters.' },
    { name: 'Skyline Coding & Algorithms Society', slug: 'skyline-coding', desc: 'Competitive programming, open-source engineering, and weekly code sprints.' },
    { name: 'Skyline Robotics & Mechatronics Lab', slug: 'skyline-robotics', desc: 'Hardware design, autonomous rovers, drones, and combat bot engineering.' },
    { name: 'Green Earth Sustainability Club', slug: 'green-earth', desc: 'Campus tree planting, zero-waste audits, and renewable energy community advocacy.' },
    { name: 'Skyline Debating & Parliamentary Union', slug: 'debate-union', desc: 'Asian Parliamentary, British Parliamentary, and World Universities debate training.' },
    { name: 'Skyline Performing Arts & Theatre', slug: 'theatre-arts', desc: 'Dramatic stage plays, street theatre (Nukkad Natak), and annual campus musical.' },
    { name: 'Skyline AI & Machine Learning Guild', slug: 'ai-guild', desc: 'Deep learning research, LLM agent hacking, and computer vision workshops.' },
    { name: 'Skyline Astronomy & Space Club', slug: 'space-astronomy', desc: 'Stargazing expeditions, astrophotography, and satellite telemetry workshops.' },
    { name: 'Skyline FinTech & Quantitative Trading', slug: 'fintech-quant', desc: 'Algorithmic trading, equity research, decentralized finance, and valuation model competitions.' },
    { name: 'Skyline Photography & Visual Media Guild', slug: 'photography-guild', desc: 'Documentary photo-walks, darkroom techniques, and visual storytelling.' },
    { name: 'Skyline Formula Racing & EV Team', slug: 'formula-racing', desc: 'Designing and building formula-style open wheel electric race vehicles.' },
    { name: 'Skyline CyberSecurity & Ethical Hacking Lab', slug: 'cyber-defense', desc: 'Capture the flag (CTF) tournaments, network defense, and zero-day research.' },
    { name: 'Skyline Model United Nations Society', slug: 'model-un', desc: 'Diplomatic simulations, global policy debate, and international delegations.' },
    { name: 'Skyline Music & Fusion Band Society', slug: 'music-fusion', desc: 'Acoustic jam circles, rock bands, classical ragas, and campus sound production.' },
    { name: 'Skyline Literary & Creative Writing Society', slug: 'literary-creative', desc: 'Poetry slams, short story workshops, and publisher of the Skyline Campus Journal.' },
    { name: 'Skyline E-Sports & Game Development Club', slug: 'esports-gamedev', desc: 'Competitive LAN tournaments, Unreal/Unity workshops, and game jam hackathons.' },
    { name: 'Skyline Biotech & Bioengineering Society', slug: 'biotech-society', desc: 'Synthetic biology, gene-editing symposiums, and bioinformatics hackathons.' },
    { name: 'Skyline Entrepreneurship & Venture Cell', slug: 'e-cell', desc: 'Student incubator, angel pitch decks, startup weekends, and founder fireside chats.' },
    { name: 'Skyline Design & UI/UX Guild', slug: 'design-guild', desc: 'Interaction design, typography critiques, Figma prototyping, and user testing sprints.' },
    { name: 'Skyline Social Outreach & Community Welfare', slug: 'social-outreach', desc: 'Underprivileged student tutoring, campus blood drives, and disaster relief logistics.' },
    { name: 'Skyline Film Appreciation & Direction Circle', slug: 'film-circle', desc: 'Indie cinema screenings, screenwriting tables, and student 48-hour film festivals.' },
    { name: 'Skyline Culinary Arts & Gastronomy Society', slug: 'culinary-arts', desc: 'Baking masterclasses, culinary history tastings, and campus charity pop-up dining.' },
    { name: 'Skyline Dance Troupe & Choreography Club', slug: 'dance-troupe', desc: 'Contemporary, hip-hop, salsa, and classical fusion dance performances.' },
    { name: 'Skyline Blockchain & Web3 Society', slug: 'blockchain-web3', desc: 'Smart contract security, zero-knowledge proofs, and decentralized applications.' },
    { name: 'Skyline Badminton & Racket Sports Club', slug: 'badminton-club', desc: 'Inter-hostel leagues, smash clinics, and intramural tournament circuits.' },
    { name: 'Skyline Mountaineering & Trekking Club', slug: 'trekking-club', desc: 'High-altitude weekend expeditions, rock climbing, and wilderness survival skills.' },
    { name: 'Skyline Philosophy & Critical Thought Forum', slug: 'philosophy-forum', desc: 'Ethics debates, epistemology salons, and discussions on consciousness & society.' },
    { name: 'Skyline Quantum Computing & Physics Circle', slug: 'quantum-circle', desc: 'Qiskit quantum circuits, condensed matter discussions, and quantum cryptography.' },
    { name: 'Skyline Chess & Strategy Club', slug: 'chess-strategy', desc: 'Rapid blitz tournaments, grandmaster analysis, and board games analytics.' },
    { name: 'Skyline Drone Engineering & Aeromodelling', slug: 'drone-aero', desc: 'FPV quadcopter racing, fixed-wing RC aircraft, and autonomous payload drops.' },
    { name: 'Skyline Animal Welfare & Stray Rescue', slug: 'animal-welfare', desc: 'Campus stray vaccination, feeding schedules, adoption fairs, and shelter volunteering.' },
    { name: 'Skyline Quiz & Trivia League', slug: 'quiz-league', desc: 'Pub quizzes, Mimir trivia circuits, sci-tech quizzes, and national college leagues.' },
    { name: 'Skyline Legal Aid & Youth Advocacy Forum', slug: 'legal-advocacy', desc: 'Youth rights workshops, mock trials, campus RTI awareness, and policy reviews.' },
    { name: 'Skyline Graphic Novel & Anime Society', slug: 'anime-manga', desc: 'Cosplay craft, manga analysis, animation illustration, and screen culture.' },
    { name: 'Skyline Yoga, Mindfulness & Wellness Club', slug: 'yoga-wellness', desc: 'Morning sunrise vinyasa, breathwork sessions, and mental resilience workshops.' },
    { name: 'Skyline Cycling & Urban Mobility Club', slug: 'cycling-mobility', desc: 'Dawn century rides, bike maintenance co-ops, and green campus transit policy.' },
    { name: 'Skyline Architecture & Built Heritage Guild', slug: 'architecture-guild', desc: 'Heritage walk documentation, parametric modeling, and campus urban design.' },
    { name: 'Skyline Mathematics & Topology Society', slug: 'math-society', desc: 'Putnam style problem-solving, number theory lectures, and combinatorics.' },
    { name: 'Skyline Chemistry & Materials Science Lab', slug: 'materials-science', desc: 'Polymer synthesis demos, green chemistry seminars, and molecular modeling.' },
    { name: 'Skyline Maker Lab & Rapid Prototyping', slug: 'maker-lab', desc: '3D printing, laser cutting, CNC milling, and DIY interactive physical computing.' },
    { name: 'Skyline Foreign Languages & Global Exchange', slug: 'language-exchange', desc: 'Polyglot conversations in German, Japanese, French, Spanish, and Mandarin.' },
    { name: 'Skyline Renewable Energy & Solar Tech Club', slug: 'solar-energy', desc: 'Campus rooftop solar audits, microgrid design, and energy storage research.' },
    { name: 'Skyline Public Speaking & Toastmasters', slug: 'public-speaking', desc: 'Impromptu speeches, keynote workshops, and communication coaching.' },
    { name: 'Skyline Data Science & Analytics Circle', slug: 'data-analytics', desc: 'Kaggle competitions, predictive modeling, data visualization, and ML ops.' },
    { name: 'Skyline Psychology & Behavioral Sciences', slug: 'psychology-society', desc: 'Cognitive bias experiments, peer wellness listening, and behavioral economics.' },
    { name: 'Skyline Heritage & Classical Music Society', slug: 'classical-music', desc: 'Sitar, tabla, violin recitals, and classical music listening appreciation.' },
    { name: 'Skyline Table Tennis & Indoor Sports', slug: 'table-tennis', desc: 'Fast-paced spin clinics, singles championships, and rec-room leagues.' },
    { name: 'Skyline Aviation & Flight Simulation Club', slug: 'aviation-sim', desc: 'Cockpit procedures, flight simulator hardware builds, and aerospace guest talks.' },
    { name: 'Skyline Board Gaming & Tabletop RPG Guild', slug: 'board-gaming', desc: 'Catan, Dungeons & Dragons campaigns, strategic deck-building, and social deduction.' },
    { name: 'Skyline Oceanography & Marine Science Club', slug: 'marine-science', desc: 'Coral restoration webinars, coastal field trips, and microplastics research.' },
    { name: 'Skyline Stand-up Comedy & Improv Collective', slug: 'comedy-improv', desc: 'Open mic stages, improv games, comedy writing rooms, and campus humor fest.' },
    { name: 'Skyline Formula Student Electric Powertrain', slug: 'formula-powertrain', desc: 'Battery management systems, inverter design, and regenerative braking.' },
  ];

  const clubs = [];
  for (let i = 0; i < clubDefinitions.length; i++) {
    const c = clubDefinitions[i];
    const club = await prisma.club.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.desc, isActive: true },
      create: {
        name: c.name,
        slug: c.slug,
        description: c.desc,
        logoUrl: CLUB_LOGOS[i % CLUB_LOGOS.length],
        isActive: true,
      },
    });
    clubs.push(club);
  }
  console.log(`  ✅ Total Clubs in DB: ${clubs.length}`);

  // ──────────────────────────────────────────────────────────
  // 2. USERS (Seed >= 55 users)
  // ──────────────────────────────────────────────────────────
  console.log('👥 Seeding Users...');
  const userDefs = [
    { email: 'admin@skyline.edu', firstName: 'Neha', lastName: 'Kulkarni', role: 'CLUB_ADMIN' },
    { email: 'em@skyline.edu', firstName: 'Sneha', lastName: 'Iyer', role: 'EVENT_MANAGER' },
    { email: 'vol@skyline.edu', firstName: 'Arjun', lastName: 'Mehta', role: 'VOLUNTEER' },
    { email: 'treasury@skyline.edu', firstName: 'Rohan', lastName: 'Gupta', role: 'TREASURER' },
    { email: 'root@skyline.edu', firstName: 'Platform', lastName: 'Admin', role: 'SUPER_ADMIN' },
    { email: 'riya@student.edu', firstName: 'Riya', lastName: 'Sharma', role: 'MEMBER' },
    { email: 'aarav@student.edu', firstName: 'Aarav', lastName: 'Verma', role: 'MEMBER' },
    { email: 'kabir.patel@skyline.edu', firstName: 'Kabir', lastName: 'Patel', role: 'CLUB_ADMIN' },
    { email: 'ananya.rao@skyline.edu', firstName: 'Ananya', lastName: 'Rao', role: 'EVENT_MANAGER' },
    { email: 'dev.sharma@skyline.edu', firstName: 'Dev', lastName: 'Sharma', role: 'TREASURER' },
    { email: 'tanvi.joshi@skyline.edu', firstName: 'Tanvi', lastName: 'Joshi', role: 'VOLUNTEER' },
    { email: 'aditya.nair@student.edu', firstName: 'Aditya', lastName: 'Nair', role: 'MEMBER' },
    { email: 'ishaan.malhotra@student.edu', firstName: 'Ishaan', lastName: 'Malhotra', role: 'MEMBER' },
    { email: 'meera.sen@student.edu', firstName: 'Meera', lastName: 'Sen', role: 'MEMBER' },
    { email: 'rohit.reddy@student.edu', firstName: 'Rohit', lastName: 'Reddy', role: 'MEMBER' },
    { email: 'zoya.khan@student.edu', firstName: 'Zoya', lastName: 'Khan', role: 'MEMBER' },
    { email: 'varun.bose@student.edu', firstName: 'Varun', lastName: 'Bose', role: 'MEMBER' },
    { email: 'tanya.deshmukh@student.edu', firstName: 'Tanya', lastName: 'Deshmukh', role: 'MEMBER' },
    { email: 'sid.chatterjee@student.edu', firstName: 'Siddharth', lastName: 'Chatterjee', role: 'MEMBER' },
    { email: 'pooja.hegde@student.edu', firstName: 'Pooja', lastName: 'Hegde', role: 'MEMBER' },
    { email: 'kunal.singh@student.edu', firstName: 'Kunal', lastName: 'Singh', role: 'MEMBER' },
    { email: 'priya.bhat@student.edu', firstName: 'Priya', lastName: 'Bhat', role: 'MEMBER' },
    { email: 'manav.kapoor@student.edu', firstName: 'Manav', lastName: 'Kapoor', role: 'MEMBER' },
    { email: 'shreya.pillai@student.edu', firstName: 'Shreya', lastName: 'Pillai', role: 'MEMBER' },
    { email: 'vikram.seth@student.edu', firstName: 'Vikram', lastName: 'Seth', role: 'MEMBER' },
    { email: 'anushka.pandey@student.edu', firstName: 'Anushka', lastName: 'Pandey', role: 'MEMBER' },
    { email: 'nikhil.das@student.edu', firstName: 'Nikhil', lastName: 'Das', role: 'MEMBER' },
    { email: 'divya.menon@student.edu', firstName: 'Divya', lastName: 'Menon', role: 'MEMBER' },
    { email: 'yash.chavan@student.edu', firstName: 'Yash', lastName: 'Chavan', role: 'MEMBER' },
    { email: 'khushi.agarwal@student.edu', firstName: 'Khushi', lastName: 'Agarwal', role: 'MEMBER' },
    { email: 'akash.tiwari@student.edu', firstName: 'Akash', lastName: 'Tiwari', role: 'MEMBER' },
    { email: 'simran.kaur@student.edu', firstName: 'Simran', lastName: 'Kaur', role: 'MEMBER' },
    { email: 'rahul.chopra@student.edu', firstName: 'Rahul', lastName: 'Chopra', role: 'MEMBER' },
    { email: 'deepika.shukla@student.edu', firstName: 'Deepika', lastName: 'Shukla', role: 'MEMBER' },
    { email: 'alok.mishra@student.edu', firstName: 'Alok', lastName: 'Mishra', role: 'MEMBER' },
    { email: 'swati.srivastava@student.edu', firstName: 'Swati', lastName: 'Srivastava', role: 'MEMBER' },
    { email: 'samir.merchant@student.edu', firstName: 'Samir', lastName: 'Merchant', role: 'MEMBER' },
    { email: 'natasha.roy@student.edu', firstName: 'Natasha', lastName: 'Roy', role: 'MEMBER' },
    { email: 'gaurav.sharma@student.edu', firstName: 'Gaurav', lastName: 'Sharma', role: 'MEMBER' },
    { email: 'bhavna.patil@student.edu', firstName: 'Bhavna', lastName: 'Patil', role: 'MEMBER' },
    { email: 'tarun.saxena@student.edu', firstName: 'Tarun', lastName: 'Saxena', role: 'MEMBER' },
    { email: 'geetika.jain@student.edu', firstName: 'Geetika', lastName: 'Jain', role: 'MEMBER' },
    { email: 'harsh.vardhan@student.edu', firstName: 'Harsh', lastName: 'Vardhan', role: 'MEMBER' },
    { email: 'sonal.bhardwaj@student.edu', firstName: 'Sonal', lastName: 'Bhardwaj', role: 'MEMBER' },
    { email: 'mohit.yadav@student.edu', firstName: 'Mohit', lastName: 'Yadav', role: 'MEMBER' },
    { email: 'pallavi.garg@student.edu', firstName: 'Pallavi', lastName: 'Garg', role: 'MEMBER' },
    { email: 'chirag.shah@student.edu', firstName: 'Chirag', lastName: 'Shah', role: 'MEMBER' },
    { email: 'sakshi.dubey@student.edu', firstName: 'Sakshi', lastName: 'Dubey', role: 'MEMBER' },
    { email: 'kartik.somani@student.edu', firstName: 'Kartik', lastName: 'Somani', role: 'MEMBER' },
    { email: 'payal.khatri@student.edu', firstName: 'Payal', lastName: 'Khatri', role: 'MEMBER' },
    { email: 'mayank.tripathi@student.edu', firstName: 'Mayank', lastName: 'Tripathi', role: 'MEMBER' },
    { email: 'richa.modi@student.edu', firstName: 'Richa', lastName: 'Modi', role: 'MEMBER' },
    { email: 'abhinav.sinha@student.edu', firstName: 'Abhinav', lastName: 'Sinha', role: 'MEMBER' },
    { email: 'kritika.talwar@student.edu', firstName: 'Kritika', lastName: 'Talwar', role: 'MEMBER' },
    { email: 'sanket.rane@student.edu', firstName: 'Sanket', lastName: 'Rane', role: 'MEMBER' },
    { email: 'urvi.parikh@student.edu', firstName: 'Urvi', lastName: 'Parikh', role: 'MEMBER' },
  ];

  const users = [];
  for (let i = 0; i < userDefs.length; i++) {
    const u = userDefs[i];
    const assignedClub = clubs[i % clubs.length]?.id;
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        role: u.role,
        clubId: u.role === 'CLUB_ADMIN' ? assignedClub : undefined,
      },
      create: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        emailVerified: true,
        isActive: true,
        clubId: u.role === 'CLUB_ADMIN' ? assignedClub : undefined,
      },
    });
    users.push(user);
  }
  console.log(`  ✅ Total Users in DB: ${users.length}`);

  // ──────────────────────────────────────────────────────────
  // 3. MEMBERSHIP PLANS (Seed >= 50 plans)
  // ──────────────────────────────────────────────────────────
  console.log('💳 Seeding Membership Plans...');
  const plans = [];
  for (let i = 0; i < clubs.length; i++) {
    const club = clubs[i];
    const planName = i === 0 ? 'Basic Membership' : `${club.name} Annual Charter Pass`;
    let plan = await prisma.membershipPlan.findFirst({
      where: { clubId: club.id, name: planName },
    });
    if (!plan) {
      plan = await prisma.membershipPlan.create({
        data: {
          clubId: club.id,
          name: planName,
          description: `Full access to ${club.name} events, workshop equipment, mentorship, and vote at AGMs.`,
          priceInPaise: (400 + (i % 6) * 150) * 100, // ₹400 - ₹1150
          durationDays: 365,
          benefits: {
            ticketDiscount: 20,
            merchDiscount: 15,
            earlyAccess: true,
            votingRights: true,
          },
          sortOrder: 1,
          isActive: true,
        },
      });
    }
    plans.push(plan);
  }
  console.log(`  ✅ Total Membership Plans: ${plans.length}`);

  // ──────────────────────────────────────────────────────────
  // 4. MEMBERSHIPS (Seed >= 50 memberships)
  // ──────────────────────────────────────────────────────────
  console.log('🎖️ Seeding Memberships...');
  const memberships = [];
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const plan = plans[i % plans.length];
    const status = i % 5 === 0 ? 'EXPIRED' : i % 7 === 0 ? 'PENDING' : 'ACTIVE';
    
    let mem = await prisma.membership.findFirst({
      where: { userId: user.id, planId: plan.id, status },
    });
    if (!mem) {
      const now = new Date();
      const start = new Date(now.getTime() - (status === 'EXPIRED' ? 400 : 30) * 86400000);
      const expiry = new Date(start.getTime() + 365 * 86400000);
      mem = await prisma.membership.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status,
          startDate: start,
          expiryDate: expiry,
        },
      });
    }
    memberships.push(mem);
  }
  console.log(`  ✅ Total Memberships: ${memberships.length}`);

  // ──────────────────────────────────────────────────────────
  // 5. DISCOUNT RULES (Seed >= 50 discount rules)
  // ──────────────────────────────────────────────────────────
  console.log('🏷️ Seeding Discount Rules...');
  const discountRules = [];
  for (let i = 0; i < clubs.length; i++) {
    const club = clubs[i];
    let rule = await prisma.discountRule.findFirst({ where: { clubId: club.id } });
    if (!rule) {
      rule = await prisma.discountRule.create({
        data: {
          clubId: club.id,
          name: `${club.name} Tier-1 Benefits`,
          discountType: 'PERCENTAGE',
          discountValue: 10 + (i % 15),
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
          isActive: true,
        },
      });
    }
    discountRules.push(rule);
  }
  console.log(`  ✅ Total Discount Rules: ${discountRules.length}`);

  // ──────────────────────────────────────────────────────────
  // 6. EVENTS & TICKET TYPES (Seed >= 52 events & ticket types)
  // ──────────────────────────────────────────────────────────
  console.log('🎪 Seeding Events & Ticket Types...');
  const eventTitles = [
    'Annual Spring Gala 2026', 'Campus Open Mic & Slam Poetry', 'HackSkyline 48-Hour Hackathon',
    'RoboWars National Combat Arena', 'Solar Mobility & EV Symposium', 'Inter-College Asian Parliamentary Debate',
    'Autumn Play: Waiting for Godot', 'Generative AI & LLM Agent Summit', 'Deep Space Astrophotography Camp',
    'Algorithmic Trading & High-Frequency Bootcamp', 'Street Documentary Photo Walk', 'Formula Electric Car Unveiling Ceremony',
    'Campus Cyber Siege CTF 2026', 'Skyline Model UN Global Conclave', 'Acoustic Sunset Lawn Jam',
    'Campus Anthology Book Launch', 'Valorant & Rocket League Campus Championship', 'CRISPR & Synthetic Biology Symposium',
    'Venture Pitch Fest & Angel Demo Day', 'Design Systems & UX Sprints with Figma', 'Campus Clean Air & Tree Census Drive',
    'Indie Cinema Premiere & Q&A with Directors', 'Artisanal Sourdough & Patisserie Workshop', 'Hip-Hop & Urban Choreography Showcase',
    'Web3 Smart Contract Auditing Masterclass', 'Annual Intra-Hostel Badminton Masters', 'Monsoon Himalayan Trek Preparation Camp',
    'Socratic Dialogues on Artificial Consciousness', 'Introduction to IBM Qiskit Quantum Computing', 'Grandmaster Blitz & Bullet Chess Tournament',
    'Autonomous FPV Drone Racing Invitational', 'Campus Dog Adoption & Vaccination Fair', 'The Skyline Mega Trivia Challenge 2026',
    'Youth Rights & Digital Privacy Legal Clinic', 'Anime Screening & Cosplay Workshop', 'Morning Sunrise Sound Healing & Vinyasa',
    'Tour de Campus: 50km Cycling Challenge', 'Architectural Heritage Sketching Walk', 'Topology & Math Puzzles Night',
    'Spectroscopy & Molecular Magic Demo', 'Arduino & Raspberry Pi Maker Expo', 'Polyglot Speed-Friending & Tapas Evening',
    'Solar Microgrid Engineering Workshop', 'TedX Skyline Student Salon', 'Kaggle Grandmaster Predictive Modeling Lab',
    'Cognitive Science & Neuroscience Colloquium', 'Sitar & Tabla Classical Baithak', 'Fast-Break Table Tennis Open',
    'Boeing 737 Cockpit Simulators & Avionics Talk', 'Dungeons & Dragons 24-Hour Campaign Marathon', 'Marine Ecology & Ocean Health Seminar',
    'Stand-up Comedy Night: The Semester Breakdown',
  ];

  const events = [];
  const ticketTypes = [];

  for (let i = 0; i < eventTitles.length; i++) {
    const title = eventTitles[i];
    const club = clubs[i % clubs.length];
    let event = await prisma.event.findFirst({ where: { clubId: club.id, title } });
    const startDate = new Date(Date.now() + (i * 3 + 2) * 86400000);
    const endDate = new Date(startDate.getTime() + 4 * 3600000);

    if (!event) {
      event = await prisma.event.create({
        data: {
          clubId: club.id,
          title,
          description: `Join us for ${title} hosted by ${club.name}. Features interactive sessions, keynote guest speakers, networking, and exclusive certificate badges.`,
          location: i % 3 === 0 ? 'Skyline Grand Auditorium' : i % 3 === 1 ? 'Block C Innovation Complex' : 'Open Air Amphitheatre',
          startDate,
          endDate,
          registrationOpen: new Date(Date.now() - 5 * 86400000),
          registrationClose: new Date(startDate.getTime() - 2 * 3600000),
          capacity: 150 + (i % 4) * 50,
          status: 'PUBLISHED',
          imageUrl: EVENT_POSTERS[i % EVENT_POSTERS.length],
        },
      });
    }
    events.push(event);

    // Ensure Ticket Types
    let memberTT = await prisma.ticketType.findFirst({
      where: { eventId: event.id, name: 'Member Pass' },
    });
    if (!memberTT) {
      memberTT = await prisma.ticketType.create({
        data: {
          eventId: event.id,
          name: 'Member Pass',
          priceInPaise: (i % 2 === 0 ? 0 : 250) * 100,
          memberPriceInPaise: (i % 2 === 0 ? 0 : 250) * 100,
          quantity: 100,
          soldCount: 15,
          isActive: true,
        },
      });
    }
    ticketTypes.push(memberTT);

    let guestTT = await prisma.ticketType.findFirst({
      where: { eventId: event.id, name: 'Guest Admission' },
    });
    if (!guestTT) {
      guestTT = await prisma.ticketType.create({
        data: {
          eventId: event.id,
          name: 'Guest Admission',
          priceInPaise: (350 + (i % 5) * 100) * 100,
          memberPriceInPaise: (i % 2 === 0 ? 0 : 250) * 100,
          quantity: 100,
          soldCount: 20,
          isActive: true,
        },
      });
    }
    ticketTypes.push(guestTT);
  }
  console.log(`  ✅ Total Events: ${events.length}`);
  console.log(`  ✅ Total Ticket Types: ${ticketTypes.length}`);

  // ──────────────────────────────────────────────────────────
  // 7. BOOKINGS, TICKETS & CHECK-INS (Seed >= 55)
  // ──────────────────────────────────────────────────────────
  console.log('🎟️ Seeding Bookings, Tickets & Check-Ins...');
  const bookings = [];
  const tickets = [];
  const checkIns = [];

  for (let i = 0; i < Math.max(55, users.length); i++) {
    const user = users[i % users.length];
    const event = events[i % events.length];
    const tt = ticketTypes.find((t) => t.eventId === event.id) || ticketTypes[0];

    let booking = await prisma.booking.findFirst({
      where: { userId: user.id, eventId: event.id },
    });

    if (!booking) {
      booking = await prisma.booking.create({
        data: {
          userId: user.id,
          eventId: event.id,
          ticketTypeId: tt.id,
          quantity: 1,
          status: 'CONFIRMED',
          totalInPaise: tt.priceInPaise,
          discountInPaise: 0,
          pointsRedeemed: 0,
        },
      });
    }
    bookings.push(booking);

    // Create Ticket
    let ticket = await prisma.ticket.findFirst({
      where: { bookingId: booking.id },
    });
    if (!ticket) {
      const code = `TKT-${event.id.slice(0, 4)}-${user.id.slice(0, 4)}-${i}`.toUpperCase();
      ticket = await prisma.ticket.create({
        data: {
          bookingId: booking.id,
          code,
          status: i % 4 === 0 ? 'USED' : 'VALID',
        },
      });
    }
    tickets.push(ticket);

    // Create Check-In for used tickets or up to 50
    if (checkIns.length < 52) {
      let checkIn = await prisma.checkIn.findUnique({
        where: { ticketId: ticket.id },
      });
      if (!checkIn) {
        checkIn = await prisma.checkIn.create({
          data: {
            ticketId: ticket.id,
            checkedBy: 'Gate Scanner Alpha',
            note: 'Verified student ID and badge credentials at door',
            createdAt: new Date(Date.now() - (i * 2 + 1) * 3600000),
          },
        });
      }
      checkIns.push(checkIn);
    }
  }
  console.log(`  ✅ Total Bookings: ${bookings.length}`);
  console.log(`  ✅ Total Tickets: ${tickets.length}`);
  console.log(`  ✅ Total CheckIns: ${checkIns.length}`);

  // ──────────────────────────────────────────────────────────
  // 8. MERCHANDISE PRODUCTS & VARIANTS (Seed >= 52 products)
  // ──────────────────────────────────────────────────────────
  console.log('🛍️ Seeding Merchandise Products & Variants...');
  const productCatalog = [
    { name: 'Skyline Peak Heavyweight Hoodie', price: 999, memberPrice: 849, category: 'Apparel', desc: '400 GSM brushed organic fleece with premium 3D peak crest embroidery.' },
    { name: 'Skyline Heritage Crest Tee', price: 499, memberPrice: 399, category: 'Apparel', desc: '100% bio-washed combed cotton with water-based screenprint.' },
    { name: 'Skyline Field Adjustable Cap', price: 399, memberPrice: 329, category: 'Accessories', desc: 'Washed twill unstructured 6-panel cap with metal brass clasp.' },
    { name: 'Skyline Insulated Hydro Flask 750ml', price: 649, memberPrice: 549, category: 'Accessories', desc: 'Double-walled vacuum insulated food-grade 18/8 stainless steel bottle.' },
    { name: 'Skyline Cordura Daypack Backpack', price: 1499, memberPrice: 1249, category: 'Bags', desc: 'Water-resistant 1000D Cordura backpack with padded 16-inch laptop compartment.' },
    { name: 'Skyline Varsity Letterman Jacket', price: 1999, memberPrice: 1699, category: 'Apparel', desc: 'Classic collegiate varsity jacket with wool blend body and faux leather sleeves.' },
    { name: 'Skyline Enamel Pin Collector Set', price: 299, memberPrice: 249, category: 'Collectibles', desc: 'Gold-plated hard enamel pins featuring the club emblems.' },
    { name: 'Skyline Canvas Tote Bag', price: 349, memberPrice: 289, category: 'Bags', desc: 'Heavyweight 14oz canvas tote with reinforced handles and interior zip pocket.' },
    { name: 'Skyline Ceramic Barista Mug 350ml', price: 299, memberPrice: 249, category: 'Accessories', desc: 'Matte glaze ceramic coffee mug with laser-engraved Skyline seal.' },
    { name: 'Skyline Grid Hardcover Journal', price: 399, memberPrice: 329, category: 'Stationery', desc: '100 GSM acid-free dot-grid pages with expandable back pocket.' },
    { name: 'Skyline Water-Resistant Windbreaker', price: 1299, memberPrice: 1099, category: 'Apparel', desc: 'Lightweight ripstop shell with zip vents and packable pouch.' },
    { name: 'Skyline Embroidered Beanie', price: 349, memberPrice: 299, category: 'Apparel', desc: 'Ribbed knit cuff beanie made from recycled poly-acrylic yarn.' },
    { name: 'Skyline Desk Mat Pro (900x400mm)', price: 799, memberPrice: 679, category: 'Deskware', desc: 'Micro-weave cloth surface with non-slip rubber base and stitched anti-fray edges.' },
    { name: 'Skyline Heavyweight Crewneck Sweatshirt', price: 899, memberPrice: 769, category: 'Apparel', desc: 'Pre-shrunk French terry crewneck with raglan sleeves.' },
    { name: 'Skyline Stainless Steel Carabiner Keychain', price: 199, memberPrice: 149, category: 'Accessories', desc: 'Heavy duty tactical carabiner with laser marked measurement scale.' },
    { name: 'Skyline Tech Organizer Pouch', price: 549, memberPrice: 449, category: 'Accessories', desc: 'Weatherproof cable organizer with elastic loops and mesh zip pockets.' },
    { name: 'Skyline Campus Lanyard with Cardholder', price: 149, memberPrice: 99, category: 'Accessories', desc: 'Silk satin finish woven lanyard with breakaway safety buckle.' },
    { name: 'Skyline Waterproof Vinyl Sticker Pack (15 pcs)', price: 199, memberPrice: 149, category: 'Stationery', desc: 'UV and scratch-resistant matte die-cut laptop vinyl decals.' },
    { name: 'Skyline Cozy Knit Athletic Socks', price: 249, memberPrice: 199, category: 'Apparel', desc: 'Cushioned terry sole crew socks with arch compression band.' },
    { name: 'Skyline Neoprene Laptop Sleeve 14-inch', price: 599, memberPrice: 499, category: 'Accessories', desc: 'High-density foam padding with scratch-free fleece lining.' },
    { name: 'Skyline Thermal Travel Tumbler 500ml', price: 499, memberPrice: 419, category: 'Accessories', desc: 'Leak-proof flip lid coffee tumbler with ceramic inner coating.' },
    { name: 'Skyline Oversized Graphic Streetwear Tee', price: 599, memberPrice: 499, category: 'Apparel', desc: 'Boxy 240 GSM drop-shoulder streetwear tee with back typography.' },
    { name: 'Skyline Gym Duffel Bag 30L', price: 1199, memberPrice: 999, category: 'Bags', desc: 'Ripstop duffel with dedicated ventilated sneaker compartment.' },
    { name: 'Skyline Microfibre Sports Towel', price: 299, memberPrice: 249, category: 'Sports', desc: 'Ultra-absorbent quick-dry microfibre fitness and travel towel.' },
    { name: 'Skyline Matte Black Metal Ballpoint Pen', price: 199, memberPrice: 149, category: 'Stationery', desc: 'Balanced weighted brass body with smooth German gel ink refill.' },
    { name: 'Skyline Classic Bucket Hat', price: 449, memberPrice: 379, category: 'Apparel', desc: 'Breathable washed cotton canvas bucket hat with stitched eyelets.' },
    { name: 'Skyline College Fleece Trackpants', price: 899, memberPrice: 749, category: 'Apparel', desc: 'Tapered fleece joggers with deep zip pockets and custom drawstrings.' },
    { name: 'Skyline Enamel Camping Plate & Bowl', price: 399, memberPrice: 329, category: 'Outdoors', desc: 'Classic speckled enamelware steel dining set for treks and camps.' },
    { name: 'Skyline Wireless Charging Mousepad', price: 999, memberPrice: 849, category: 'Electronics', desc: '15W fast Qi-charging pad integrated into premium faux-leather pad.' },
    { name: 'Skyline Bluetooth Travel Speaker', price: 1299, memberPrice: 1099, category: 'Electronics', desc: 'IPX7 waterproof 5W compact speaker with carabiner loop.' },
    { name: 'Skyline Silicon Phone Grip & Stand', price: 149, memberPrice: 99, category: 'Accessories', desc: 'Collapsible ergonomic phone grip with magnetic car mount base.' },
    { name: 'Skyline Performance Quick-Dry Polo', price: 699, memberPrice: 589, category: 'Apparel', desc: 'Moisture-wicking athletic pique polo with rib-knit collar.' },
    { name: 'Skyline Aluminum Carabiner Water Bottle 1L', price: 499, memberPrice: 419, category: 'Accessories', desc: 'Single-wall lightweight aluminum expedition water bottle.' },
    { name: 'Skyline Retro Embroidered Patch Set', price: 249, memberPrice: 199, category: 'Collectibles', desc: 'Iron-on woven vintage patches for jackets and backpacks.' },
    { name: 'Skyline Double-Layer Umbrella', price: 599, memberPrice: 499, category: 'Accessories', desc: 'Windproof inverted folding umbrella with Teflon coated canopy.' },
    { name: 'Skyline Cotton Bandana & Scarf', price: 199, memberPrice: 149, category: 'Accessories', desc: 'Soft woven Paisley and crest bandana for festivals and runs.' },
    { name: 'Skyline Metal Bookmark with Tassel', price: 149, memberPrice: 99, category: 'Stationery', desc: 'Etched brass filigree bookmark with silk thread tassel.' },
    { name: 'Skyline Eco Bamboo Utensil Set', price: 299, memberPrice: 239, category: 'Sustainability', desc: 'Fork, knife, spoon, chopsticks and straw in roll-up canvas pouch.' },
    { name: 'Skyline Magnetic Whiteboard Desk Planner', price: 499, memberPrice: 399, category: 'Stationery', desc: 'Dry-erase weekly planner with wooden easel stand and markers.' },
    { name: 'Skyline Compact First Aid & Survival Tin', price: 349, memberPrice: 289, category: 'Outdoors', desc: 'Emergency pocket first-aid supplies in embossed steel tin.' },
    { name: 'Skyline High-Visibility Running Sash', price: 249, memberPrice: 199, category: 'Sports', desc: 'Reflective 3M Scotchlite sash with LED flasher for night marathons.' },
    { name: 'Skyline Playing Cards Collector Deck', price: 299, memberPrice: 249, category: 'Collectibles', desc: 'Custom illustrated poker deck with linen embossed finish.' },
    { name: 'Skyline Corduroy Overshirt', price: 1499, memberPrice: 1299, category: 'Apparel', desc: '12-wale heavyweight 100% cotton corduroy layering overshirt.' },
    { name: 'Skyline Insulated Food Jar 400ml', price: 599, memberPrice: 499, category: 'Accessories', desc: 'Vacuum insulated lunch thermos with folding stainless spoon.' },
    { name: 'Skyline UV-Blocking Polarized Sunglasses', price: 799, memberPrice: 679, category: 'Accessories', desc: 'Classic Wayfarer frame with TAC polarized UV400 lenses.' },
    { name: 'Skyline Braided USB-C to C Cable (2m)', price: 349, memberPrice: 289, category: 'Electronics', desc: '100W PD fast charge cable with Kevlar-reinforced braided nylon.' },
    { name: 'Skyline Micro-Fleece Half-Zip Pullover', price: 999, memberPrice: 849, category: 'Apparel', desc: 'Warm 200g polar fleece midlayer with elasticized cuffs.' },
    { name: 'Skyline Stainless Steel Measuring Tumbler', price: 349, memberPrice: 289, category: 'Accessories', desc: 'Cocktail shaker and barista measuring beaker with scale marks.' },
    { name: 'Skyline Cork Yoga Mat & Carry Strap', price: 1299, memberPrice: 1099, category: 'Sports', desc: 'Natural antibacterial cork surface with non-slip TPE backing.' },
    { name: 'Skyline Embroidered Canvas Apron', price: 599, memberPrice: 499, category: 'Apparel', desc: 'Heavy cross-back strap apron for maker lab, art, and cooking popups.' },
    { name: 'Skyline Brass Whistle on Paracord', price: 199, memberPrice: 149, category: 'Outdoors', desc: 'Pealess loud emergency whistle on 550 reflective paracord lanyard.' },
    { name: 'Skyline Commuter Sling Bag 5L', price: 899, memberPrice: 769, category: 'Bags', desc: 'Crossbody sling with magnetic FIDLOCK buckle and hidden passport pocket.' },
  ];

  const products = [];
  const variants = [];

  for (let i = 0; i < productCatalog.length; i++) {
    const item = productCatalog[i];
    const club = clubs[i % clubs.length];
    let product = await prisma.product.findFirst({
      where: { clubId: club.id, name: item.name },
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          clubId: club.id,
          name: item.name,
          description: item.desc,
          imageUrl: PRODUCT_IMAGES[i % PRODUCT_IMAGES.length],
          isActive: true,
        },
      });
    }
    products.push(product);

    // Ensure variants exist for each product
    const sizes = item.category === 'Apparel' ? ['S', 'M', 'L', 'XL'] : ['Standard'];
    for (const sz of sizes) {
      const sku = `${product.id.slice(0, 4)}-${sz}-${i}`.toUpperCase();
      let variant = await prisma.productVariant.findFirst({
        where: { productId: product.id, name: sz },
      });
      if (!variant) {
        variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            name: sz,
            sku,
            priceInPaise: item.price * 100,
            memberPriceInPaise: item.memberPrice * 100,
            stock: 15 + (i % 5) * 5,
            lowStockThreshold: 5,
            isActive: true,
          },
        });
      }
      variants.push(variant);
    }
  }
  console.log(`  ✅ Total Products: ${products.length}`);
  console.log(`  ✅ Total Product Variants: ${variants.length}`);

  // ──────────────────────────────────────────────────────────
  // 9. ORDERS & ORDER ITEMS (Seed >= 55 orders & order items)
  // ──────────────────────────────────────────────────────────
  console.log('📦 Seeding Orders & Order Items...');
  const orders = [];
  const orderItems = [];

  for (let i = 0; i < Math.max(55, users.length); i++) {
    const user = users[i % users.length];
    const variant = variants[i % variants.length];

    let order = await prisma.order.findFirst({
      where: { userId: user.id, note: `Campus store seed order #${i + 1}` },
    });

    if (!order) {
      const statuses = ['PAID', 'FULFILLED', 'PROCESSING', 'PENDING_PAYMENT'];
      const status = statuses[i % statuses.length];
      const qty = 1 + (i % 2);
      const totalInPaise = variant.priceInPaise * qty;

      order = await prisma.order.create({
        data: {
          userId: user.id,
          status,
          totalInPaise,
          discountInPaise: (i % 3 === 0 ? 50 : 0) * 100,
          pointsRedeemed: i % 4 === 0 ? 20 : 0,
          note: `Campus store seed order #${i + 1}`,
          createdAt: new Date(Date.now() - (i * 12 + 1) * 3600000),
        },
      });

      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order.id,
          variantId: variant.id,
          quantity: qty,
          unitPriceInPaise: variant.priceInPaise,
          totalInPaise,
        },
      });
      orderItems.push(orderItem);
    }
    orders.push(order);
  }
  console.log(`  ✅ Total Orders: ${orders.length}`);
  console.log(`  ✅ Total Order Items: ${orderItems.length}`);

  // ──────────────────────────────────────────────────────────
  // 10. PAYMENTS, REFUNDS & PRICING SNAPSHOTS (Seed >= 55)
  // ──────────────────────────────────────────────────────────
  console.log('💳 Seeding Payments, Refunds & Snapshots...');
  const payments = [];
  const refunds = [];
  const snapshots = [];

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const idempotencyKey = `PAY-ORD-${order.id}`;

    let payment = await prisma.payment.findUnique({
      where: { idempotencyKey },
    });

    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          amountInPaise: order.totalInPaise,
          currency: 'INR',
          status: i % 10 === 0 ? 'REFUNDED' : 'SUCCESS',
          providerName: 'MOCK_GATEWAY',
          providerRef: `GATEWAY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
          idempotencyKey,
          metadata: { orderId: order.id, customerNote: order.note },
          createdAt: order.createdAt,
        },
      });
    }
    payments.push(payment);

    // Seed Refund if status is REFUNDED or for first 52 payments
    if (refunds.length < 52) {
      let refund = await prisma.refund.findUnique({
        where: { paymentId: payment.id },
      });
      if (!refund) {
        refund = await prisma.refund.create({
          data: {
            paymentId: payment.id,
            amountInPaise: payment.amountInPaise,
            reason: i % 2 === 0 ? 'Customer size exchange return' : 'Event cancellation policy refund',
            providerRef: `REF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
          },
        });
      }
      refunds.push(refund);
    }

    // Seed PurchasePricingSnapshot
    if (snapshots.length < 52) {
      let snap = await prisma.purchasePricingSnapshot.findUnique({
        where: { orderId: order.id },
      });
      if (!snap) {
        snap = await prisma.purchasePricingSnapshot.create({
          data: {
            orderId: order.id,
            breakdown: {
              subtotal: order.totalInPaise,
              discount: order.discountInPaise,
              pointsUsed: order.pointsRedeemed,
              finalAmount: order.totalInPaise - order.discountInPaise,
              currency: 'INR',
            },
          },
        });
      }
      snapshots.push(snap);
    }
  }
  console.log(`  ✅ Total Payments: ${payments.length}`);
  console.log(`  ✅ Total Refunds: ${refunds.length}`);
  console.log(`  ✅ Total Pricing Snapshots: ${snapshots.length}`);

  // ──────────────────────────────────────────────────────────
  // 11. ANNOUNCEMENTS & NOTIFICATION DELIVERIES (Seed >= 52)
  // ──────────────────────────────────────────────────────────
  console.log('📢 Seeding Announcements & Notification Deliveries...');
  const announcementTemplates = [
    { title: 'Welcome to the New Academic Semester 2026', content: 'Campus club charter registrations and annual membership renewals are now open! Explore 50+ active student organizations.' },
    { title: 'Annual General Meeting & Elections Notice', content: 'Skyline Student Association AGM is scheduled for next Friday. All active student members hold voting rights.' },
    { title: 'HackSkyline 2026 Team Registrations Open', content: 'Form teams of up to 4 students. Hardware kits and GPU compute credits will be distributed at Block C Innovation Lab.' },
    { title: 'New Eco-Friendly Dining Containers Campus Policy', content: 'The Green Earth Sustainability club has launched reusable container borrowing at all student cafeterias.' },
    { title: 'Winter Gala Early Bird Tickets Live', content: 'Reserve your passes early before tickets open to non-member guests. Valid digital QR passes will be required at entry.' },
    { title: 'Campus Blood Donation & Health Drive', content: 'Join the Skyline Welfare League at the Student Health Center this Wednesday. Every donor receives a meal badge.' },
    { title: 'Formula Electric Unveiling Ceremony', content: 'Come witness the roll-out of the newly built F-EV26 open-wheel electric race car at the Engineering Quad.' },
    { title: 'Robotics Team Qualifies for National Finals', content: 'Congratulations to our Mechatronics team for taking 1st place in the zonal autonomous rover qualifiers!' },
    { title: 'Campus Photography Exhibition & Gallery Walk', content: 'Over 80 curated student photo-stories are on display along the main library colonnade this week.' },
    { title: 'Auditions for Spring Stage Musical', content: 'Theatre and Music societies are hosting joint open auditions for actors, singers, and stage crew members.' },
  ];

  const announcements = [];
  const deliveries = [];

  for (let i = 0; i < 52; i++) {
    const template = announcementTemplates[i % announcementTemplates.length];
    const club = clubs[i % clubs.length];
    const title = `${template.title} [Vol. ${i + 1}]`;

    let ann = await prisma.announcement.findFirst({
      where: { clubId: club.id, title },
    });

    if (!ann) {
      ann = await prisma.announcement.create({
        data: {
          clubId: club.id,
          title,
          content: `${template.content} Sponsored by ${club.name}. Contact the club executive desk for inquiries.`,
          isPublished: true,
          publishedAt: new Date(Date.now() - (i * 8 + 2) * 3600000),
          audience: { target: 'ALL_STUDENTS', clubId: club.id },
        },
      });
    }
    announcements.push(ann);

    // Notification delivery
    const user = users[i % users.length];
    let del = await prisma.notificationDelivery.findFirst({
      where: { announcementId: ann.id, recipientEmail: user.email },
    });
    if (!del) {
      del = await prisma.notificationDelivery.create({
        data: {
          announcementId: ann.id,
          recipientEmail: user.email,
          channel: 'EMAIL',
          status: 'SENT',
          attempts: 1,
          lastAttemptAt: new Date(),
        },
      });
    }
    deliveries.push(del);
  }
  console.log(`  ✅ Total Announcements: ${announcements.length}`);
  console.log(`  ✅ Total Notification Deliveries: ${deliveries.length}`);

  // ──────────────────────────────────────────────────────────
  // 12. LOYALTY ACCOUNTS, TRANSACTIONS & REDEMPTIONS (Seed >= 52)
  // ──────────────────────────────────────────────────────────
  console.log('⭐ Seeding Loyalty Accounts, Transactions & Redemptions...');
  const loyaltyAccounts = [];
  const loyaltyTransactions = [];
  const loyaltyRedemptions = [];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    let account = await prisma.loyaltyAccount.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        balance: 150 + (i % 8) * 30,
        lifetimeEarned: 300 + (i % 8) * 50,
        lifetimeRedeemed: 150 + (i % 8) * 20,
      },
    });
    loyaltyAccounts.push(account);

    // Create Loyalty Transaction
    const idempotencyKey = `LOYALTY-TX-${account.id}-${i}`;
    let tx = await prisma.loyaltyTransaction.findUnique({
      where: { idempotencyKey },
    });
    if (!tx) {
      const type = i % 2 === 0 ? 'EARN' : 'REDEEM';
      tx = await prisma.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type,
          points: 50 + (i % 10) * 10,
          balanceAfter: account.balance,
          description: type === 'EARN' ? 'Points awarded for event attendance' : 'Points redeemed on merchandise purchase',
          referenceType: type === 'EARN' ? 'EVENT' : 'ORDER',
          referenceId: orders[i % orders.length]?.id || 'SAMPLE-REF',
          idempotencyKey,
        },
      });
    }
    loyaltyTransactions.push(tx);

    // Create Loyalty Redemption
    if (loyaltyRedemptions.length < 52) {
      let red = await prisma.loyaltyRedemption.findUnique({
        where: { transactionId: tx.id },
      });
      if (!red) {
        red = await prisma.loyaltyRedemption.create({
          data: {
            transactionId: tx.id,
            orderId: orders[i % orders.length]?.id,
            amountInPaise: tx.points * 100,
          },
        });
      }
      loyaltyRedemptions.push(red);
    }
  }
  console.log(`  ✅ Total Loyalty Accounts: ${loyaltyAccounts.length}`);
  console.log(`  ✅ Total Loyalty Transactions: ${loyaltyTransactions.length}`);
  console.log(`  ✅ Total Loyalty Redemptions: ${loyaltyRedemptions.length}`);

  // ──────────────────────────────────────────────────────────
  // 13. FUNDRAISERS, VOLUNTEER TASKS & ASSIGNMENTS (Seed >= 52)
  // ──────────────────────────────────────────────────────────
  console.log('🤝 Seeding Fundraisers, Volunteer Tasks & Assignments...');
  const fundraiserTitles = [
    'Emergency Student Textbook & Hardware Fund', 'Annual Winter Charity Bake & Craft Sale',
    'Formula EV Racing Battery Pack Sponsorship', 'Campus Stray Animal Care & Winter Shelters',
    'Community Tutoring Supplies & Book Drive', 'Campus Biodiversity Tree Planting Campaign',
    'Open Source Innovation Lab 3D Printer Fund', 'Student Mental Health & De-stress Sanctuary',
    'Clean Energy Solar Charging Benches Drive', 'Disaster Relief & Campus Flood Assistance',
    'Underprivileged Youth STEM Robotics Kits', 'Heritage Cinema Preservation & Projector Fund',
  ];

  const fundraisers = [];
  const volunteerTasks = [];
  const taskAssignments = [];

  for (let i = 0; i < 52; i++) {
    const title = `${fundraiserTitles[i % fundraiserTitles.length]} - Chapter ${i + 1}`;
    const club = clubs[i % clubs.length];
    let fund = await prisma.fundraiser.findFirst({
      where: { clubId: club.id, title },
    });

    if (!fund) {
      fund = await prisma.fundraiser.create({
        data: {
          clubId: club.id,
          title,
          description: `Grassroots initiative by ${club.name} to finance community tools, books, and essential gear.`,
          targetInPaise: (50000 + (i % 10) * 10000) * 100,
          raisedInPaise: (25000 + (i % 10) * 8000) * 100,
          startDate: new Date(Date.now() - 10 * 86400000),
          endDate: new Date(Date.now() + 20 * 86400000),
          isActive: true,
        },
      });
    }
    fundraisers.push(fund);

    // Create Volunteer Task for this fundraiser
    let task = await prisma.volunteerTask.findFirst({
      where: { fundraiserId: fund.id, title: `Logistics & Booth Duty #${i + 1}` },
    });
    if (!task) {
      task = await prisma.volunteerTask.create({
        data: {
          fundraiserId: fund.id,
          title: `Logistics & Booth Duty #${i + 1}`,
          description: 'Coordinate table setups, donation QR collection stands, and hand out badge pins.',
          deadline: new Date(Date.now() + (i * 2 + 5) * 86400000),
          status: i % 3 === 0 ? 'COMPLETED' : i % 3 === 1 ? 'IN_PROGRESS' : 'TODO',
        },
      });
    }
    volunteerTasks.push(task);

    // Assign volunteer task to user
    const volunteerUser = users[i % users.length];
    let assign = await prisma.taskAssignment.findUnique({
      where: { taskId_userId: { taskId: task.id, userId: volunteerUser.id } },
    });
    if (!assign) {
      assign = await prisma.taskAssignment.create({
        data: {
          taskId: task.id,
          userId: volunteerUser.id,
          status: task.status,
        },
      });
    }
    taskAssignments.push(assign);
  }
  console.log(`  ✅ Total Fundraisers: ${fundraisers.length}`);
  console.log(`  ✅ Total Volunteer Tasks: ${volunteerTasks.length}`);
  console.log(`  ✅ Total Task Assignments: ${taskAssignments.length}`);

  // ──────────────────────────────────────────────────────────
  // 14. EXPENSES & REIMBURSEMENTS (Seed >= 52)
  // ──────────────────────────────────────────────────────────
  console.log('💰 Seeding Expenses & Reimbursements...');
  const expenseTemplates = [
    { desc: 'Purchased 50m Cat6 Ethernet cables for hackathon network grid', amt: 2450 },
    { desc: 'Auditorium sound technician overtime and wireless lapel battery packs', amt: 4800 },
    { desc: 'Printing of glossy event posters and campus signage boards', amt: 1750 },
    { desc: 'Biodegradable paper plates, napkins and coffee cups for gala', amt: 3200 },
    { desc: 'First aid kits, bandages and electrolyte powders for marathon', amt: 1200 },
    { desc: 'Robotics chassis laser cut acrylic sheets and M3 standoff screws', amt: 3950 },
    { desc: 'Guest keynote speaker campus guest house accommodation & dinner', amt: 6500 },
    { desc: 'Banner standees and aluminum eyelet grommets for club expo', amt: 2100 },
    { desc: '3D printing PLA filament spools (Black & White 1kg)', amt: 2800 },
    { desc: 'Refreshments and snacks for all volunteer staff shifts', amt: 4100 },
  ];

  const expenses = [];
  const reimbursements = [];

  for (let i = 0; i < 52; i++) {
    const template = expenseTemplates[i % expenseTemplates.length];
    const user = users[i % users.length];
    const club = clubs[i % clubs.length];
    const fund = fundraisers[i % fundraisers.length];

    const description = `${template.desc} (Claim #${i + 1})`;
    let exp = await prisma.expense.findFirst({
      where: { description },
    });

    if (!exp) {
      const status = i % 4 === 0 ? 'PAID' : i % 4 === 1 ? 'APPROVED' : i % 4 === 2 ? 'UNDER_REVIEW' : 'SUBMITTED';
      exp = await prisma.expense.create({
        data: {
          userId: user.id,
          clubId: club.id,
          fundraiserId: fund.id,
          description,
          amountInPaise: (template.amt + (i % 6) * 200) * 100,
          receiptUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80',
          status,
          rejectionReason: null,
          createdAt: new Date(Date.now() - (i * 14 + 1) * 3600000),
        },
      });
    }
    expenses.push(exp);

    // Reimbursement for approved or paid expenses (ensure at least 52 reimbursements)
    let rem = await prisma.reimbursement.findUnique({
      where: { expenseId: exp.id },
    });
    if (!rem) {
      rem = await prisma.reimbursement.create({
        data: {
          expenseId: exp.id,
          approvedBy: 'Rohan Gupta (Central Treasury Officer)',
          amountInPaise: exp.amountInPaise,
          paidAt: new Date(Date.now() - (i * 10 + 1) * 3600000),
          note: 'Approved per Skyline SA Financial Bylaws Article 4.3 with attached receipt vouchers.',
        },
      });
    }
    reimbursements.push(rem);
  }
  console.log(`  ✅ Total Expenses: ${expenses.length}`);
  console.log(`  ✅ Total Reimbursements: ${reimbursements.length}`);

  // ──────────────────────────────────────────────────────────
  // 15. FINANCIAL TRANSACTIONS (Seed >= 52 ledger entries)
  // ──────────────────────────────────────────────────────────
  console.log('📑 Seeding Financial Ledger Transactions...');
  const financialCategories = [
    'MEMBERSHIP_DUES', 'TICKET_INCOME', 'MERCHANDISE_SALES',
    'FUNDRAISER_INCOME', 'DONATION', 'EXPENSE', 'REIMBURSEMENT',
  ];

  const financialTransactions = [];
  for (let i = 0; i < 55; i++) {
    const category = financialCategories[i % financialCategories.length];
    const club = clubs[i % clubs.length];
    const desc = `${category.replace(/_/g, ' ')} - Entry batch ref #${i + 101}`;

    let tx = await prisma.financialTransaction.findFirst({
      where: { description: desc },
    });
    if (!tx) {
      tx = await prisma.financialTransaction.create({
        data: {
          category,
          amountInPaise: (1200 + (i % 15) * 450) * 100,
          description: desc,
          referenceType: category.includes('INCOME') ? 'REVENUE' : 'DISBURSEMENT',
          referenceId: `REF-LEDGER-${i + 1}`,
          clubId: club.id,
          date: new Date(Date.now() - (i * 10 + 1) * 3600000),
        },
      });
    }
    financialTransactions.push(tx);
  }
  console.log(`  ✅ Total Financial Transactions: ${financialTransactions.length}`);

  // ──────────────────────────────────────────────────────────
  // 16. AUDIT LOGS (Seed >= 52 audit logs)
  // ──────────────────────────────────────────────────────────
  console.log('📜 Seeding Audit Logs...');
  const auditActions = [
    'LOGIN_SUCCESS', 'CREATE_EVENT', 'UPDATE_EVENT', 'CHECKIN_SCAN',
    'SUBMIT_EXPENSE', 'APPROVE_EXPENSE', 'REIMBURSE_PAYMENT',
    'CREATE_PRODUCT', 'UPDATE_STOCK', 'PURCHASE_MEMBERSHIP',
    'PUBLISH_ANNOUNCEMENT', 'DISBURSE_FUNDS',
  ];

  const auditLogs = [];
  for (let i = 0; i < 55; i++) {
    const actor = users[i % users.length];
    const action = auditActions[i % auditActions.length];

    let log = await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action,
        resource: action.split('_')[1] || 'SYSTEM',
        resourceId: `RES-${i + 1}`,
        details: { ip: `192.168.1.${10 + (i % 80)}`, client: 'SkylineWeb/2.4', step: i + 1 },
        ipAddress: `192.168.1.${10 + (i % 80)}`,
        createdAt: new Date(Date.now() - (i * 8 + 1) * 3600000),
      },
    });
    auditLogs.push(log);
  }
  console.log(`  ✅ Total Audit Logs: ${auditLogs.length}`);

  // ──────────────────────────────────────────────────────────
  // 17. MAILING LIST SUBSCRIPTIONS (Seed >= 52)
  // ──────────────────────────────────────────────────────────
  console.log('📬 Seeding Mailing Subscriptions...');
  const subscriptions = [];
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    let sub = await prisma.mailingListSubscription.findUnique({
      where: { userId_channel: { userId: user.id, channel: 'EMAIL' } },
    });
    if (!sub) {
      sub = await prisma.mailingListSubscription.create({
        data: {
          userId: user.id,
          channel: 'EMAIL',
          isSubscribed: true,
          consentGivenAt: new Date(),
        },
      });
    }
    subscriptions.push(sub);
  }
  console.log(`  ✅ Total Mailing Subscriptions: ${subscriptions.length}`);

  // ──────────────────────────────────────────────────────────
  // 18. PAYMENT WEBHOOK EVENTS (Seed >= 52)
  // ──────────────────────────────────────────────────────────
  console.log('⚡ Seeding Payment Webhook Events...');
  const webhookEvents = [];
  for (let i = 0; i < payments.length; i++) {
    const payment = payments[i];
    const providerEventId = `EVT-WEBHOOK-${payment.id}`;
    let evt = await prisma.paymentWebhookEvent.findUnique({
      where: { providerEventId },
    });
    if (!evt) {
      evt = await prisma.paymentWebhookEvent.create({
        data: {
          paymentId: payment.id,
          providerEventId,
          eventType: 'payment.captured',
          payload: {
            id: providerEventId,
            amount: payment.amountInPaise,
            currency: 'INR',
            status: 'captured',
          },
          processed: true,
        },
      });
    }
    webhookEvents.push(evt);
  }
  console.log(`  ✅ Total Webhook Events: ${webhookEvents.length}`);

  // ──────────────────────────────────────────────────────────
  // 19. USER AUTHORITIES (Seed >= 52)
  // ──────────────────────────────────────────────────────────
  console.log('🛡️ Seeding User Authorities...');
  const authorityList = [
    'events.read', 'events.create', 'events.update', 'events.delete',
    'tickets.scan', 'tickets.issue', 'treasury.read', 'treasury.approve',
    'store.read', 'store.manage_inventory', 'members.read', 'announcements.post'
  ];

  const userAuthorities = [];
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const auth = authorityList[i % authorityList.length];
    let ua = await prisma.userAuthority.findUnique({
      where: { userId_authority: { userId: user.id, authority: auth } },
    });
    if (!ua) {
      ua = await prisma.userAuthority.create({
        data: {
          userId: user.id,
          authority: auth,
        },
      });
    }
    userAuthorities.push(ua);
  }
  console.log(`  ✅ Total User Authorities: ${userAuthorities.length}`);

  console.log('🎉 Seeding successfully completed!');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
