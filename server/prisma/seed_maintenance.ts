import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Ensuring SystemConfig exists...');
  
  const config = await prisma.systemConfig.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      maintenanceMode: false,
      maintenanceMsg: 'Estamos em manutenção para melhorar a sua experiência. Voltamos em breve!'
    }
  });
  
  console.log('SystemConfig:', config);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
