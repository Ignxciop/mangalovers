export function normalizeChapterNumber(raw) {
    if (raw === null || raw === undefined) return { name: null, number: null };
    const str = String(raw).trim();
    if (!str) return { name: null, number: null };

    const stripped = str.replace(/\.0+$/, "").replace(/[^\d.]/g, "");

    if (!stripped) {
        return { name: str, number: null };
    }

    const number = parseFloat(stripped);
    if (Number.isNaN(number)) {
        return { name: str, number: null };
    }

    return { name: stripped, number };
}
