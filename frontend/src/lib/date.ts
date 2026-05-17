export function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const hours = Math.floor(diff / 3600);
    const days = Math.floor(diff / 86400);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (diff < 60) return "Justo ahora";
    if (minutes < 60) return `${minutes} min`;
    if (hours === 1) return "1 hora";
    if (hours < 24) return `${hours} horas`;
    if (days === 1) return "Ayer";
    if (days <= 7) return `${days} días`;
    if (weeks === 1) return "1 semana";
    if (weeks <= 4) return `${weeks} semanas`;
    if (months === 1) return "1 mes";
    if (months <= 11) return `${months} meses`;
    if (years === 1) return "1 año";
    return `${years} años`;
}
