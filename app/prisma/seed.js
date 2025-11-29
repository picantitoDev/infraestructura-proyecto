import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = 'Piero';
  const email = 'piero.dev@outlook.com';
  const password = 'picantito12';
  const rol = 'Admin';

  // Check if user already exists
  const existing = await prisma.usuarios.findUnique({ where: { username } });
  if (existing) {
    console.log('Admin user already exists, skipping.');
    return;
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the user
  const user = await prisma.usuarios.create({
    data: {
      username,
      email,
      password: hashedPassword,
      rol,
    },
  });

  console.log('✅ Admin user created:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
