import type { Lead } from '../types';

export function computeScore(
    row: Record<string, unknown>,
    numericCol: string | null,
    allRows: Record<string, unknown>[],
    hotThreshold = 7,
    _warmThreshold = 4
): number {
    void hotThreshold;
    void _warmThreshold;

    if (numericCol) {
        const vals = allRows
            .map((r) => parseFloat(String(r[numericCol])))
            .filter((v) => !isNaN(v));
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const v = parseFloat(String(row[numericCol]));
        if (!isNaN(v) && max !== min) {
            return Math.round(((v - min) / (max - min)) * 9 * 10) / 10 + 1;
        }
    }

    let score = 5;
    const str = JSON.stringify(row).toLowerCase();

    const hasPhone = Object.values(row).some((v) =>
        String(v).match(/\d{8,}/)
    );
    const hasEmail = Object.values(row).some((v) => String(v).match(/@/));
    const hasWeb = Object.values(row).some((v) =>
        String(v).match(/https?:\/\//)
    );
    const hasSocial = Object.values(row).some((v) =>
        String(v).match(/facebook|instagram|linkedin/i)
    );
    const hasRating = Object.values(row).some(
        (v) =>
            !isNaN(parseFloat(String(v))) &&
            parseFloat(String(v)) >= 1 &&
            parseFloat(String(v)) <= 5
    );

    if (hasPhone) score += 1.2;
    if (hasEmail) score += 1.0;
    if (hasWeb) score += 0.8;
    if (hasSocial) score += 0.5;
    if (hasRating) {
        const ratingVal =
            Object.values(row)
                .map((v) => parseFloat(String(v)))
                .find((v) => !isNaN(v) && v >= 1 && v <= 5) || 0;
        score += (ratingVal / 5) * 1.5;
    }

    if (str.match(/clinic|saúde|medic|health/)) score += 0.3;
    if (str.match(/laser|estética|estetic|beauty|beleza/)) score += 0.4;
    if (str.match(/dentist|odonto/)) score += 0.3;

    const name = String(
        Object.values(row)[1] || Object.values(row)[0] || ''
    );
    let h = 0;
    for (const c of name) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
    score += ((Math.abs(h) % 21) - 10) * 0.04;

    return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

export function scoreClass(
    score: number,
    hot: number,
    warm: number
): 'hot' | 'warm' | 'cold' {
    if (score >= hot) return 'hot';
    if (score >= warm) return 'warm';
    return 'cold';
}

export function scoreLabel(
    score: number,
    hot: number,
    warm: number
): string {
    if (score >= hot) return '🔥 Lead Quente';
    if (score >= warm) return '🌡 Lead Morno';
    return '❄ Lead Frio';
}

export function scoreReason(row: Record<string, unknown>): string {
    const reasons: string[] = [];
    if (Object.values(row).some((v) => String(v).match(/@/)))
        reasons.push('tem email');
    if (Object.values(row).some((v) => String(v).match(/\d{8,}/)))
        reasons.push('tem telefone');
    if (Object.values(row).some((v) => String(v).match(/https?:\/\//)))
        reasons.push('tem website');
    if (
        Object.values(row).some((v) =>
            String(v).match(/facebook|instagram/i)
        )
    )
        reasons.push('tem redes sociais');
    return reasons.length
        ? '✓ ' + reasons.join(', ')
        : 'Scoring baseado em perfil';
}

export function buildInsights(
    leads: Lead[],
    hot: Lead[],
    catCol: string | null,
    avg: number,
    hotThreshold: number
) {
    const ins: {
        icon: string;
        title: string;
        text: string;
        cls: string;
    }[] = [];

    ins.push({
        icon: '🔥',
        title: `${hot.length} lead${hot.length !== 1 ? 's' : ''} quente${hot.length !== 1 ? 's' : ''} aguardando contato`,
        text: `${Math.round((hot.length / leads.length) * 100)}% da sua base tem score ≥${hotThreshold}. Leads quentes perdem qualidade em 48–72h — priorize contato hoje.`,
        cls: 'green',
    });

    if (catCol) {
        const catCounts: Record<string, number> = {};
        hot.forEach((l) => {
            const v = String(l[catCol] || '—');
            catCounts[v] = (catCounts[v] || 0) + 1;
        });
        const topCat = Object.entries(catCounts).sort(
            (a, b) => b[1] - a[1]
        )[0];
        if (topCat)
            ins.push({
                icon: '📌',
                title: `Segmento mais quente: "${topCat[0]}"`,
                text: `${topCat[1]} leads com score alto neste segmento. Concentre energia aqui para maximizar conversão.`,
                cls: 'green',
            });
    }

    const noContact = leads.filter(
        (l) =>
            !Object.values(l).some((v) => String(v).match(/\d{8,}|@/))
    );
    if (noContact.length)
        ins.push({
            icon: '⚠',
            title: `${noContact.length} leads sem telefone ou email`,
            text: `Esses registros não têm informação de contato detectável. Enriqueça antes de ativar.`,
            cls: 'amber',
        });

    ins.push({
        icon: '📈',
        title: `Score médio: ${avg.toFixed(1)}/10`,
        text:
            avg >= 7
                ? 'Base de alta qualidade. Velocidade de contato é crítica — leads esfriam em 48h.'
                : avg >= 5
                    ? 'Base mista. Separe o top 30% e trabalhe com cadência diferenciada para o restante.'
                    : 'Base com baixo potencial médio. Revise a fonte de prospecção ou os critérios de scoring.',
        cls: avg >= 6 ? 'green' : 'amber',
    });

    const withSocial = leads.filter((l) =>
        Object.values(l).some((v) =>
            String(v).match(/facebook|instagram|linkedin/i)
        )
    );
    if (withSocial.length)
        ins.push({
            icon: '📱',
            title: `${withSocial.length} leads com redes sociais`,
            text: `Esses leads têm presença digital ativa — canal adicional de contato disponível.`,
            cls: '',
        });

    const ganhos = leads.filter((l) => l._pipeline === 'ganho');
    if (ganhos.length)
        ins.push({
            icon: '✅',
            title: `${ganhos.length} lead${ganhos.length !== 1 ? 's' : ''} marcado${ganhos.length !== 1 ? 's' : ''} como ganho${ganhos.length !== 1 ? 's' : ''}`,
            text: `Taxa de fechamento atual: ${Math.round((ganhos.length / leads.length) * 100)}%. Revise os padrões desses leads para otimizar o scoring.`,
            cls: 'green',
        });

    return ins.slice(0, 6);
}
