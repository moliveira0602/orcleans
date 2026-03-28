export function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'agora mesmo';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'min atrás';
    if (diff < 86400000) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('pt-BR');
}
