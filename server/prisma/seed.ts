import { prisma } from '../src/config/database.js';
import { hashPassword } from '../src/utils/crypto.js';

async function seed() {
  console.log('Seeding database...');

  const existing = await prisma.organization.findFirst();
  if (existing) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  const passwordHash = await hashPassword('Orca1234!');

  const org = await prisma.organization.create({
    data: {
      name: 'ETOS Admin',
      plan: 'growth',
      maxLeads: 5000,
      maxUsers: 10,
    },
  });

  const superAdmin = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: 'Super Admin',
      email: 'test@etos.pt',
      passwordHash,
      role: 'super_admin',
    },
  });

  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: 'Demo User',
      email: 'demo@etos.pt',
      passwordHash,
      role: 'admin',
    },
  });

  const leads = await prisma.lead.createMany({
    data: [
      {
        organizationId: org.id,
        nome: 'Clínica Saúde Olhão',
        segmento: 'Clínica Médica',
        avaliacao: 4.5,
        reviews: 127,
        preco: '€€',
        endereco: 'Rua Dr. Francisco Sá Carneiro, Olhão',
        status: 'Ativo',
        horario: '09:00-19:00',
        telefone: '+351 289 123 456',
        website: 'https://clinicasaude.pt',
        email: 'info@clinicasaude.pt',
        servicos: ['Consultas', 'Exames', 'Urgência'],
        score: 9,
        pipelineStage: 'novo',
        lat: 37.0267,
        lng: -7.8369,
        geocodeStatus: 'ok',
      },
      {
        organizationId: org.id,
        nome: 'Restaurante Marisqueira Ria',
        segmento: 'Restaurante',
        avaliacao: 4.8,
        reviews: 342,
        preco: '€€€',
        endereco: 'Cais da Ria Formosa, Olhão',
        status: 'Ativo',
        horario: '12:00-23:00',
        telefone: '+351 289 789 012',
        website: 'https://marisqueiraria.pt',
        email: 'reservas@marisqueiraria.pt',
        servicos: ['Marisco', 'Peixe fresco', 'Eventos'],
        score: 7,
        pipelineStage: 'qualificado',
        lat: 37.0280,
        lng: -7.8400,
        geocodeStatus: 'ok',
      },
      {
        organizationId: org.id,
        nome: 'Pet Shop Patinhas',
        segmento: 'Pet Shop',
        avaliacao: 4.2,
        reviews: 89,
        preco: '€€',
        endereco: 'Av. da República, Porto',
        status: 'Ativo',
        horario: '09:00-20:00',
        telefone: '+351 22 345 6789',
        website: 'https://patinhas.pt',
        email: 'loja@patinhas.pt',
        servicos: ['Banho', 'Tosa', 'Veterinário'],
        score: 5,
        pipelineStage: 'proposta',
        lat: 41.1579,
        lng: -8.6291,
        geocodeStatus: 'ok',
      },
      {
        organizationId: org.id,
        nome: 'Clínica Dental Sorriso',
        segmento: 'Clínica Dentária',
        avaliacao: 4.7,
        reviews: 215,
        preco: '€€',
        endereco: 'Av. do Brasil, Lisboa',
        status: 'Ativo',
        horario: '09:00-18:00',
        telefone: '+351 21 123 4567',
        website: 'https://sorriso.pt',
        email: 'contacto@sorriso.pt',
        servicos: ['Ortodontia', 'Implantes', 'Branqueamento'],
        score: 8,
        pipelineStage: 'novo',
        lat: 38.7223,
        lng: -9.1393,
        geocodeStatus: 'ok',
      },
      {
        organizationId: org.id,
        nome: 'Café Central',
        segmento: 'Café',
        avaliacao: 4.3,
        reviews: 156,
        preco: '€',
        endereco: 'Praça do Comércio, Lisboa',
        status: 'Ativo',
        horario: '07:00-22:00',
        telefone: '+351 21 987 6543',
        website: 'https://cafecentral.pt',
        email: 'info@cafecentral.pt',
        servicos: ['Café', 'Pastelaria', 'Almoços'],
        score: 6,
        pipelineStage: 'qualificado',
        lat: 38.7081,
        lng: -9.1366,
        geocodeStatus: 'ok',
      },
    ],
  });

  await prisma.activity.createMany({
    data: [
      {
        organizationId: org.id,
        userId: user.id,
        title: 'Lead importado',
        sub: '3 leads adicionados via CSV',
        icon: 'upload',
        createdAt: new Date(),
      },
      {
        organizationId: org.id,
        userId: user.id,
        title: 'Score atualizado',
        sub: 'Clínica Saúde Olhão: score 9/10',
        icon: 'target',
        createdAt: new Date(Date.now() - 3600000),
      },
    ],
  });

  console.log(`Seed complete!`);
  console.log(`  Organization: ${org.name} (${org.id})`);
  console.log(`  Super Admin: ${superAdmin.name} (${superAdmin.email})`);
  console.log(`  Admin User: ${user.name} (${user.email})`);
  console.log(`  Leads: ${leads.count}`);
  console.log(`  Password: Orca1234!`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
