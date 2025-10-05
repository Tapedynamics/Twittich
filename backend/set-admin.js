const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setFirstUserAsAdmin() {
  try {
    // Get first user
    const firstUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!firstUser) {
      console.log('No users found');
      return;
    }

    // Update to admin
    await prisma.user.update({
      where: { id: firstUser.id },
      data: { isAdmin: true },
    });

    console.log(`✅ User ${firstUser.username} (${firstUser.email}) is now admin!`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setFirstUserAsAdmin();
