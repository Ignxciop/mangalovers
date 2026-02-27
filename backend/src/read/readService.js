import { prisma } from "../config/prisma.js";

export async function getReadChapterIds(userId, seriesId) {
    const reads = await prisma.userChapterRead.findMany({
        where: {
            userId,
            chapter: { seriesId: Number(seriesId) },
        },
        select: { chapterId: true },
    });
    return reads.map((r) => r.chapterId);
}

export const toggleChapterRead = async (userId, chapterId) => {
    const existing = await prisma.userChapterRead.findUnique({
        where: {
            userId_chapterId: {
                userId,
                chapterId,
            },
        },
    });
    if (existing) {
        return await unmarkChaptersFrom(userId, chapterId);
    }
    return await markChaptersUntil(userId, chapterId);
};

export async function markChaptersUntil(userId, chapterId) {
    const target = await prisma.chapter.findUnique({
        where: { id: Number(chapterId) },
        select: { seriesId: true, name: true },
    });

    if (!target) throw new Error("Chapter not found");

    const targetNumber = parseFloat(target.name);

    const allChapters = await prisma.chapter.findMany({
        where: { seriesId: target.seriesId },
        select: { id: true, name: true },
    });

    const chapters = allChapters.filter(
        (c) => parseFloat(c.name) <= targetNumber,
    );

    if (chapters.length === 0) return { updated: 0 };

    await prisma.userChapterRead.createMany({
        data: chapters.map((c) => ({ userId, chapterId: c.id })),
        skipDuplicates: true,
    });

    return { updated: chapters.length };
}

export async function unmarkChaptersFrom(userId, chapterId) {
    const target = await prisma.chapter.findUnique({
        where: { id: Number(chapterId) },
        select: { seriesId: true, name: true },
    });

    if (!target) throw new Error("Chapter not found");

    const targetNumber = parseFloat(target.name);

    const allChapters = await prisma.chapter.findMany({
        where: { seriesId: target.seriesId },
        select: { id: true, name: true },
    });

    const chapters = allChapters.filter(
        (c) => parseFloat(c.name) >= targetNumber,
    );

    await prisma.userChapterRead.deleteMany({
        where: {
            userId,
            chapterId: { in: chapters.map((c) => c.id) },
        },
    });

    return { updated: chapters.length };
}

export async function getUserReadingStats(userId) {
    const totalChaptersRead = await prisma.userChapterRead.count({
        where: { userId },
    });

    const favorites = await prisma.userFavorite.findMany({
        where: { userId },
        include: {
            series: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    cover: true,
                    chapterCount: true,
                    status: true,
                    chapters: {
                        select: { id: true, name: true },
                    },
                },
            },
        },
        orderBy: { updatedAt: "desc" },
    });

    if (favorites.length === 0) {
        return {
            totalChaptersRead,
            totalSeries: 0,
            completedSeries: 0,
            completionPercent: 0,
            estimatedHours: Math.round((totalChaptersRead * 7) / 60),
            continueReading: [],
        };
    }

    const seriesIds = favorites.map((f) => f.seriesId);

    const readDetails = await prisma.userChapterRead.findMany({
        where: { userId, chapter: { seriesId: { in: seriesIds } } },
        select: {
            createdAt: true,
            chapter: { select: { seriesId: true, name: true, id: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    // Último capítulo leído por serie
    const lastReadMap = new Map();
    const lastReadDateMap = new Map();
    for (const r of readDetails) {
        const sid = r.chapter.seriesId;
        const current = lastReadMap.get(sid);
        // Guardar el de número más alto
        if (!current || parseFloat(r.chapter.name) > parseFloat(current)) {
            lastReadMap.set(sid, r.chapter.name);
        }
        // Para ordenar por fecha de lectura más reciente
        if (!lastReadDateMap.has(sid)) {
            lastReadDateMap.set(sid, r.createdAt);
        }
    }

    // Último capítulo disponible por serie
    const lastAvailableMap = new Map();
    for (const fav of favorites) {
        const chapters = fav.series.chapters;
        if (chapters.length === 0) continue;
        const last = chapters.reduce((a, b) =>
            parseFloat(a.name) > parseFloat(b.name) ? a : b,
        );
        lastAvailableMap.set(fav.seriesId, last.name);
    }

    // Series completadas (leído hasta el último capítulo)
    let completedSeries = 0;
    for (const fav of favorites) {
        const lastRead = parseFloat(lastReadMap.get(fav.seriesId) ?? "-1");
        const lastAvail = parseFloat(lastAvailableMap.get(fav.seriesId) ?? "0");
        if (lastRead >= lastAvail && lastAvail > 0) completedSeries++;
    }

    // % promedio de finalización
    let totalPercent = 0;
    let seriesWithProgress = 0;
    for (const fav of favorites) {
        const lastRead = parseFloat(lastReadMap.get(fav.seriesId) ?? "0");
        const lastAvail = parseFloat(lastAvailableMap.get(fav.seriesId) ?? "0");
        if (lastAvail > 0) {
            totalPercent += Math.min((lastRead / lastAvail) * 100, 100);
            seriesWithProgress++;
        }
    }
    const completionPercent =
        seriesWithProgress > 0
            ? Math.round(totalPercent / seriesWithProgress)
            : 0;

    // Continuar leyendo — series con progreso, ordenadas por última lectura
    const continueReading = favorites
        .filter((fav) => lastReadMap.has(fav.seriesId))
        .sort((a, b) => {
            const dateA = lastReadDateMap.get(a.seriesId) ?? new Date(0);
            const dateB = lastReadDateMap.get(b.seriesId) ?? new Date(0);
            return new Date(dateB) - new Date(dateA);
        })
        .slice(0, 5)
        .map((fav) => {
            const lastRead = lastReadMap.get(fav.seriesId) ?? null;
            const lastAvail = lastAvailableMap.get(fav.seriesId) ?? null;

            // Contar capítulos leídos de esta serie
            const readCountForSeries = readDetails.filter(
                (r) => r.chapter.seriesId === fav.seriesId,
            ).length;

            const totalChapters = fav.series.chapters.length;
            const chaptersLeft =
                totalChapters > 0
                    ? Math.max(0, totalChapters - readCountForSeries)
                    : null;

            return {
                id: fav.series.id,
                name: fav.series.name,
                slug: fav.series.slug,
                cover: fav.series.cover,
                lastReadChapterName: lastRead,
                lastAvailableChapterName: lastAvail,
                chaptersLeft,
            };
        });

    // Calcular rachas
    let currentStreak = 0;
    let bestStreak = 0;

    if (totalChaptersRead > 0) {
        const allReads = await prisma.userChapterRead.findMany({
            where: { userId },
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
        });

        // Obtener días únicos de lectura
        const readDays = [
            ...new Set(
                allReads.map(
                    (r) => new Date(r.createdAt).toISOString().split("T")[0],
                ),
            ),
        ].sort((a, b) => b.localeCompare(a)); // desc

        if (readDays.length > 0) {
            const today = new Date().toISOString().split("T")[0];
            const yesterday = new Date(Date.now() - 86400000)
                .toISOString()
                .split("T")[0];

            // Racha actual — debe incluir hoy o ayer para estar activa
            if (readDays[0] === today || readDays[0] === yesterday) {
                currentStreak = 1;
                for (let i = 1; i < readDays.length; i++) {
                    const prev = new Date(readDays[i - 1]);
                    const curr = new Date(readDays[i]);
                    const diffDays = Math.round((prev - curr) / 86400000);
                    if (diffDays === 1) {
                        currentStreak++;
                    } else {
                        break;
                    }
                }
            }

            // Mejor racha histórica
            let streak = 1;
            for (let i = 1; i < readDays.length; i++) {
                const prev = new Date(readDays[i - 1]);
                const curr = new Date(readDays[i]);
                const diffDays = Math.round((prev - curr) / 86400000);
                if (diffDays === 1) {
                    streak++;
                    bestStreak = Math.max(bestStreak, streak);
                } else {
                    streak = 1;
                }
            }
            bestStreak = Math.max(bestStreak, currentStreak);
        }
    }

    return {
        totalChaptersRead,
        totalSeries: favorites.length,
        completedSeries,
        completionPercent,
        estimatedHours: Math.round((totalChaptersRead * 7) / 60),
        currentStreak,
        bestStreak,
        continueReading,
    };
}

export async function getFullStats(userId) {
    // Query principal — todo en paralelo
    const [allReads, favorites, allReadsByDay] = await Promise.all([
        prisma.userChapterRead.findMany({
            where: { userId },
            select: {
                createdAt: true,
                chapter: {
                    select: {
                        seriesId: true,
                        name: true,
                        series: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                cover: true,
                                chapterCount: true,
                                genres: {
                                    select: {
                                        genre: { select: { name: true } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        }),
        prisma.userFavorite.findMany({
            where: { userId },
            include: {
                series: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        cover: true,
                        chapterCount: true,
                        status: true,
                        chapters: { select: { id: true, name: true } },
                        genres: {
                            select: { genre: { select: { name: true } } },
                        },
                    },
                },
            },
        }),
        prisma.userChapterRead.findMany({
            where: { userId },
            select: { createdAt: true },
        }),
    ]);

    const totalChaptersRead = allReads.length;
    const totalPagesEstimated = totalChaptersRead * 20;
    const estimatedHours = Math.round((totalChaptersRead * 7) / 60);
    const totalSeries = favorites.length;

    // Series completadas
    const lastReadMap = new Map();
    for (const r of allReads) {
        const sid = r.chapter.seriesId;
        const current = lastReadMap.get(sid);
        if (!current || parseFloat(r.chapter.name) > parseFloat(current)) {
            lastReadMap.set(sid, r.chapter.name);
        }
    }

    let completedSeries = 0;
    for (const fav of favorites) {
        const chapters = fav.series.chapters;
        if (chapters.length === 0) continue;
        const lastAvail = chapters.reduce((a, b) =>
            parseFloat(a.name) > parseFloat(b.name) ? a : b,
        ).name;
        const lastRead = lastReadMap.get(fav.seriesId) ?? "-1";
        if (parseFloat(lastRead) >= parseFloat(lastAvail)) completedSeries++;
    }

    const startedSeries = lastReadMap.size;
    const completionRate =
        startedSeries > 0
            ? Math.round((completedSeries / startedSeries) * 100)
            : 0;

    // Género más leído
    const genreCount = new Map();
    for (const r of allReads) {
        for (const g of r.chapter.series.genres) {
            const name = g.genre.name;
            genreCount.set(name, (genreCount.get(name) ?? 0) + 1);
        }
    }
    const topGenre =
        [...genreCount.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

    // Top 3 géneros
    const topGenres = [...genreCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    // Día más activo (lunes, martes, etc.)
    const dayCount = new Array(7).fill(0);
    const dayNames = [
        "Domingo",
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado",
    ];
    for (const r of allReadsByDay) {
        dayCount[new Date(r.createdAt).getDay()]++;
    }
    const mostActiveDay = dayNames[dayCount.indexOf(Math.max(...dayCount))];

    // Actividad por día de semana (para gráfico)
    const activityByDay = dayNames.map((name, i) => ({
        name: name.slice(0, 3),
        count: dayCount[i],
    }));

    // Rachas
    const readDays = [
        ...new Set(
            allReadsByDay.map(
                (r) => new Date(r.createdAt).toISOString().split("T")[0],
            ),
        ),
    ].sort((a, b) => b.localeCompare(a));

    let currentStreak = 0;
    let bestStreak = 0;

    if (readDays.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000)
            .toISOString()
            .split("T")[0];

        if (readDays[0] === today || readDays[0] === yesterday) {
            currentStreak = 1;
            for (let i = 1; i < readDays.length; i++) {
                const prev = new Date(readDays[i - 1]);
                const curr = new Date(readDays[i]);
                if (Math.round((prev - curr) / 86400000) === 1) currentStreak++;
                else break;
            }
        }

        let streak = 1;
        for (let i = 1; i < readDays.length; i++) {
            const prev = new Date(readDays[i - 1]);
            const curr = new Date(readDays[i]);
            if (Math.round((prev - curr) / 86400000) === 1) {
                streak++;
                bestStreak = Math.max(bestStreak, streak);
            } else {
                streak = 1;
            }
        }
        bestStreak = Math.max(bestStreak, currentStreak);
    }

    // Actividad últimos 30 días (heatmap)
    const last30 = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last30.push(d.toISOString().split("T")[0]);
    }
    const readsByDate = new Map();
    for (const r of allReadsByDay) {
        const day = new Date(r.createdAt).toISOString().split("T")[0];
        readsByDate.set(day, (readsByDate.get(day) ?? 0) + 1);
    }
    const activityLast30 = last30.map((date) => ({
        date,
        count: readsByDate.get(date) ?? 0,
    }));

    // Capítulos por mes últimos 6 meses
    const monthlyActivity = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("es-ES", {
            month: "short",
            year: "2-digit",
        });
        monthlyActivity.push({ key, label, count: 0 });
    }
    for (const r of allReads) {
        const d = new Date(r.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const entry = monthlyActivity.find((m) => m.key === key);
        if (entry) entry.count++;
    }

    // Top 5 series más leídas
    const seriesReadCount = new Map();
    const seriesInfo = new Map();
    for (const r of allReads) {
        const sid = r.chapter.seriesId;
        seriesReadCount.set(sid, (seriesReadCount.get(sid) ?? 0) + 1);
        if (!seriesInfo.has(sid)) {
            seriesInfo.set(sid, {
                name: r.chapter.series.name,
                slug: r.chapter.series.slug,
                cover: r.chapter.series.cover,
                chapterCount: r.chapter.series.chapterCount,
            });
        }
    }
    const topSeries = [...seriesReadCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, chaptersRead]) => ({
            ...seriesInfo.get(id),
            chaptersRead,
        }));

    // Primer día de lectura
    const firstReadDate = allReads.length > 0 ? allReads[0].createdAt : null;

    // Promedio capítulos por día activo
    const avgChaptersPerDay =
        readDays.length > 0
            ? Math.round(totalChaptersRead / readDays.length)
            : 0;

    return {
        totalChaptersRead,
        totalPagesEstimated,
        estimatedHours,
        totalSeries,
        startedSeries,
        completedSeries,
        completionRate,
        topGenre: topGenre ? topGenre[0] : null,
        topGenres,
        mostActiveDay,
        activityByDay,
        currentStreak,
        bestStreak,
        activityLast30,
        monthlyActivity,
        topSeries,
        firstReadDate,
        avgChaptersPerDay,
        totalActiveDays: readDays.length,
    };
}
