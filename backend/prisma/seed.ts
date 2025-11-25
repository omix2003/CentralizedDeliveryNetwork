import { PrismaClient, UserRole, VehicleType, AgentStatus, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🗑️  Clearing existing data...');
  await prisma.order.deleteMany();
  await prisma.agentDocument.deleteMany();
  await prisma.agentLocation.deleteMany();
  await prisma.partnerDailyStats.deleteMany();
  await prisma.dailyStats.deleteMany();
  await prisma.appEvent.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.notificationToken.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.user.deleteMany();

  // Hash password for all users (default password: "password123")
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Admin User
  console.log('👤 Creating admin user...');
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@delivery.com',
      phone: '+1234567890',
      passwordHash: hashedPassword,
      role: UserRole.ADMIN,
      emailVerified: new Date(),
      phoneVerified: true,
    },
  });
  console.log(`✅ Created admin: ${adminUser.email}`);

  // Create Agent Users
  console.log('🚴 Creating agent users...');
  const agents = [
    {
      name: 'John Rider',
      email: 'john@agent.com',
      phone: '+1234567891',
      vehicleType: VehicleType.BIKE,
      city: 'New York',
      state: 'NY',
      pincode: '10001',
      isApproved: true,
      status: AgentStatus.ONLINE,
      rating: 4.8,
      totalOrders: 150,
      completedOrders: 145,
      cancelledOrders: 5,
      acceptanceRate: 95.5,
    },
    {
      name: 'Sarah Driver',
      email: 'sarah@agent.com',
      phone: '+1234567892',
      vehicleType: VehicleType.CAR,
      city: 'Los Angeles',
      state: 'CA',
      pincode: '90001',
      isApproved: true,
      status: AgentStatus.ONLINE,
      rating: 4.9,
      totalOrders: 200,
      completedOrders: 198,
      cancelledOrders: 2,
      acceptanceRate: 98.0,
    },
    {
      name: 'Mike Scooter',
      email: 'mike@agent.com',
      phone: '+1234567893',
      vehicleType: VehicleType.SCOOTER,
      city: 'Chicago',
      state: 'IL',
      pincode: '60601',
      isApproved: true,
      status: AgentStatus.OFFLINE,
      rating: 4.5,
      totalOrders: 80,
      completedOrders: 75,
      cancelledOrders: 5,
      acceptanceRate: 90.0,
    },
    {
      name: 'Emma Bicycle',
      email: 'emma@agent.com',
      phone: '+1234567894',
      vehicleType: VehicleType.BICYCLE,
      city: 'San Francisco',
      state: 'CA',
      pincode: '94102',
      isApproved: false, // Not yet approved
      status: AgentStatus.OFFLINE,
      rating: 0,
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      acceptanceRate: 0,
    },
  ];

  const createdAgents = [];
  for (const agentData of agents) {
    const user = await prisma.user.create({
      data: {
        name: agentData.name,
        email: agentData.email,
        phone: agentData.phone,
        passwordHash: hashedPassword,
        role: UserRole.AGENT,
        emailVerified: new Date(),
        phoneVerified: true,
      },
    });

    const agent = await prisma.agent.create({
      data: {
        userId: user.id,
        vehicleType: agentData.vehicleType,
        status: agentData.status,
        rating: agentData.rating,
        totalOrders: agentData.totalOrders,
        completedOrders: agentData.completedOrders,
        cancelledOrders: agentData.cancelledOrders,
        acceptanceRate: agentData.acceptanceRate,
        city: agentData.city,
        state: agentData.state,
        pincode: agentData.pincode,
        isApproved: agentData.isApproved,
        lastOnlineAt: agentData.status === AgentStatus.ONLINE ? new Date() : null,
      },
    });

    createdAgents.push({ user, agent });
    console.log(`✅ Created agent: ${user.email} (${agentData.vehicleType})`);
  }

  // Create Partner Users
  console.log('🏢 Creating partner users...');
  const partners = [
    {
      name: 'Swiggy Integration',
      email: 'swiggy@partner.com',
      phone: '+1234567901',
      companyName: 'Swiggy',
      city: 'Mumbai',
    },
    {
      name: 'Zomato Integration',
      email: 'zomato@partner.com',
      phone: '+1234567902',
      companyName: 'Zomato',
      city: 'Delhi',
    },
    {
      name: 'Uber Eats',
      email: 'ubereats@partner.com',
      phone: '+1234567903',
      companyName: 'Uber Eats',
      city: 'Bangalore',
    },
  ];

  const createdPartners = [];
  for (const partnerData of partners) {
    const user = await prisma.user.create({
      data: {
        name: partnerData.name,
        email: partnerData.email,
        phone: partnerData.phone,
        passwordHash: hashedPassword,
        role: UserRole.PARTNER,
        emailVerified: new Date(),
        phoneVerified: true,
      },
    });

    // Generate API key (simple version - in production use crypto.randomBytes)
    const apiKey = `pk_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const partner = await prisma.partner.create({
      data: {
        userId: user.id,
        companyName: partnerData.companyName,
        apiKey: apiKey,
        webhookUrl: `https://${partnerData.companyName.toLowerCase()}.com/webhook`,
        isActive: true,
        city: partnerData.city,
      },
    });

    createdPartners.push({ user, partner });
    console.log(`✅ Created partner: ${user.email} (${partnerData.companyName})`);
    console.log(`   API Key: ${apiKey}`);
  }

  // Create some orders
  console.log('📦 Creating sample orders...');
  const orders = [
    {
      partner: createdPartners[0],
      agent: createdAgents[0],
      pickupLat: 40.7128,
      pickupLng: -74.0060,
      dropLat: 40.7589,
      dropLng: -73.9851,
      payoutAmount: 50.0,
      status: OrderStatus.DELIVERED,
      priority: 'NORMAL',
    },
    {
      partner: createdPartners[0],
      agent: null,
      pickupLat: 40.7505,
      pickupLng: -73.9934,
      dropLat: 40.7282,
      dropLng: -73.9942,
      payoutAmount: 75.0,
      status: OrderStatus.SEARCHING_AGENT,
      priority: 'HIGH',
    },
    {
      partner: createdPartners[1],
      agent: createdAgents[1],
      pickupLat: 34.0522,
      pickupLng: -118.2437,
      dropLat: 34.0689,
      dropLng: -118.4452,
      payoutAmount: 60.0,
      status: OrderStatus.OUT_FOR_DELIVERY,
      priority: 'NORMAL',
    },
  ];

  for (const orderData of orders) {
    const order = await prisma.order.create({
      data: {
        partnerId: orderData.partner.partner.id,
        agentId: orderData.agent?.agent.id,
        pickupLat: orderData.pickupLat,
        pickupLng: orderData.pickupLng,
        dropLat: orderData.dropLat,
        dropLng: orderData.dropLng,
        payoutAmount: orderData.payoutAmount,
        status: orderData.status,
        priority: orderData.priority,
        assignedAt: orderData.agent ? new Date() : null,
        pickedUpAt: orderData.status === OrderStatus.OUT_FOR_DELIVERY ? new Date() : null,
        deliveredAt: orderData.status === OrderStatus.DELIVERED ? new Date() : null,
      },
    });
    console.log(`✅ Created order: ${order.id} (${orderData.status})`);
  }

  // Create some agent documents
  console.log('📄 Creating agent documents...');
  for (const { agent } of createdAgents.slice(0, 3)) {
    await prisma.agentDocument.createMany({
      data: [
        {
          agentId: agent.id,
          documentType: 'LICENSE',
          fileName: 'driving_license.pdf',
          fileUrl: 'https://example.com/documents/license.pdf',
          verified: true,
        },
        {
          agentId: agent.id,
          documentType: 'VEHICLE_REG',
          fileName: 'vehicle_registration.pdf',
          fileUrl: 'https://example.com/documents/vehicle_reg.pdf',
          verified: true,
        },
        {
          agentId: agent.id,
          documentType: 'ID_PROOF',
          fileName: 'id_proof.pdf',
          fileUrl: 'https://example.com/documents/id_proof.pdf',
          verified: true,
        },
      ],
    });
  }
  console.log('✅ Created agent documents');

  console.log('\n✨ Seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   - 1 Admin user (admin@delivery.com)`);
  console.log(`   - ${createdAgents.length} Agent users`);
  console.log(`   - ${createdPartners.length} Partner users`);
  console.log(`   - ${orders.length} Sample orders`);
  console.log('\n🔑 Default password for all users: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

