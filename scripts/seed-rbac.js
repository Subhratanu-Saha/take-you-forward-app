const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEFAULT_ROLES = [
  { name: 'SUPER_ADMIN', description: 'Full system access and user management' },
  { name: 'STORE_MANAGER', description: 'Store operations and catalog management' },
  { name: 'SUPPORT_AGENT', description: 'Customer service and order tracking' },
  { name: 'AUDITOR', description: 'Read-only access to audit logs and compliance' },
  { name: 'MARKETING_USER', description: 'Promotional campaigns and customer engagement' },
];

async function seedRBAC() {
  console.log('🌱 Starting RBAC seeding...');

  try {
    // 1. Seed Default Roles
    console.log('📦 Seeding default roles...');
    const roleMap = {};

    for (const r of DEFAULT_ROLES) {
      const createdRole = await prisma.role.upsert({
        where: { name: r.name },
        update: { description: r.description },
        create: {
          name: r.name,
          description: r.description,
        },
      });
      roleMap[r.name] = createdRole.roleid;
      console.log(`  ✔ Role: ${r.name}`);
    }

    // 2. Seed Initial Bootstrap Superadmin
    console.log('👤 Seeding initial bootstrap superadmin user...');
    const adminEmail = process.env.INITIAL_SUPERADMIN_EMAIL || 'admin@takeyouforward.com';
    const adminUsername = process.env.INITIAL_SUPERADMIN_USERNAME || 'superadmin';
    const rawPassword = process.env.INITIAL_SUPERADMIN_PASSWORD || 'SuperAdmin@123';

    // Hash password with 10 salt rounds using bcryptjs
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const superAdmin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        roleid: roleMap.SUPER_ADMIN,
        isactive: true,
      },
      create: {
        username: adminUsername,
        email: adminEmail,
        password: hashedPassword,
        roleid: roleMap.SUPER_ADMIN,
        isactive: true,
      },
      include: {
        role: true,
      },
    });

    console.log(`  ✔ Superadmin created/verified: ${superAdmin.email} (Role: ${superAdmin.role.name})`);
    console.log('✅ RBAC seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding RBAC:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedRBAC();
