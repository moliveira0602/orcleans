import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getSpatialSuggestions(organizationId: string) {
  // 1. Group leads by city and calculate average score and outcome success
  const cityStats = await prisma.lead.groupBy({
    by: ['cidade'],
    where: { organizationId },
    _count: {
      id: true,
    },
    _avg: {
      score: true,
      outcomeScore: true,
    },
  });

  // 2. Identify "Clusters" (Cities with high success or high density)
  const suggestions = cityStats
    .filter(stat => stat.cidade && stat.cidade !== '—')
    .map(stat => {
      const density = stat._count.id;
      const avgScore = stat._avg.score || 0;
      const avgOutcome = stat._avg.outcomeScore || 0;
      
      // Potential formula: (Density * 0.3) + (AvgScore * 0.4) + (AvgOutcome * 0.3)
      const potential = (density * 0.3) + (avgScore * 0.7) + (avgOutcome * 2.0);

      return {
        region: stat.cidade,
        density,
        avgScore,
        avgOutcome,
        potential: Math.round(potential * 10) / 10,
        reason: potential > 15 ? 'Alta conversão histórica' : potential > 10 ? 'Densidade de leads qualificados' : 'Potencial moderado',
      };
    })
    .sort((a, b) => b.potential - a.potential)
    .slice(0, 5);

  return suggestions;
}
