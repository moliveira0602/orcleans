import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'mherculano.oliveira@gmail.com' },
      include: { organization: true }
    });
    
    console.log('====================================');
    if (!user) {
      console.log('Utilizador não encontrado!');
      return;
    }
    
    console.log(`User ID: ${user.id}`);
    console.log(`Org ID: ${user.organizationId}`);
    console.log(`Org Name: ${user.organization?.name}`);
    console.log(`Org Leads Consumed (cached): ${user.organization?.leadsConsumed}`);
    
    if (user.organizationId) {
      const realLeadCount = await prisma.lead.count({
        where: { organizationId: user.organizationId }
      });
      console.log(`Real Lead Count in DB for this Org: ${realLeadCount}`);
      
      const latestLeads = await prisma.lead.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true, nome: true, createdAt: true }
      });
      console.log('Latest leads for this org:', latestLeads);
    }
    
    const totalLeads = await prisma.lead.count();
    console.log(`Total Leads in entire DB: ${totalLeads}`);
    
    const leadsWithoutOrg = await prisma.lead.count({
      where: { organizationId: null as any }
    });
    console.log(`Leads sem organizationId na DB: ${leadsWithoutOrg}`);
    
    console.log('====================================');
  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
