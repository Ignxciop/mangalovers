export type UserRole = "ADMIN" | "USER";
export type UserStatus = "ACTIVE" | "BANNED" | "SUSPENDED";

export interface AdminUser {
    id: string;
    email: string;
    name: string;
    lastname: string;
    role: UserRole;
    status: UserStatus;
    lastLoginAt: string | null;
    createdAt: string;
    _count: {
        suggestions: number;
        favorites: number;
        chapterReads: number;
    };
}

export interface AdminUserListResponse {
    success: boolean;
    data: AdminUser[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface UpdateRoleResponse {
    success: boolean;
    message: string;
    data: {
        id: string;
        email: string;
        name: string;
        lastname: string;
        role: UserRole;
        status: UserStatus;
        lastLoginAt: string | null;
        createdAt: string;
    };
}

export type UpdateStatusResponse = UpdateRoleResponse;

export interface AdminMetrics {
    users: {
        total: number;
        regular: number;
        admins: number;
    };
    content: {
        series: number;
        chapters: number;
    };
    suggestions: {
        total: number;
        today: number;
        byStatus: Record<string, number>;
    };
}

export interface AdminMetricsResponse {
    success: boolean;
    data: AdminMetrics;
}

export interface OverviewMetrics extends AdminMetrics {
    users: {
        total: number;
        regular: number;
        admins: number;
        activeToday: number;
        activeWeek: number;
        newToday: number;
        newWeek: number;
    };
    content: {
        series: number;
        chapters: number;
        updatedToday: number;
        chaptersToday: number;
        chaptersNoPages: number;
    };
    suggestions: {
        total: number;
        today: number;
        open: number;
        byStatus: Record<string, number>;
    };
    scraper: {
        provider: string;
        status: string;
        startedAt: string;
        finishedAt: string | null;
        seriesProcessed: number;
        chaptersCreated: number;
        pagesScraped: number;
        errors: number;
        errorMessage: string | null;
    } | null;
}

export interface OverviewResponse {
    success: boolean;
    data: OverviewMetrics;
}

export interface ScraperRun {
    id: number;
    provider: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    seriesProcessed: number;
    chaptersCreated: number;
    chaptersUpdated: number;
    pagesScraped: number;
    errors: number;
    errorMessage: string | null;
}

export interface ProviderMetrics {
    id: number;
    name: string;
    seriesCount: number;
    lastRun: ScraperRun | null;
    weekRuns: number;
    weekSeriesProcessed: number;
    weekChaptersCreated: number;
    weekPagesScraped: number;
    weekErrors: number;
}

export interface ScraperMetricsData {
    recentRuns: ScraperRun[];
    providers: ProviderMetrics[];
}

export interface ScraperMetricsResponse {
    success: boolean;
    data: ScraperMetricsData;
}

export interface MonthlyRegistration {
    month: string;
    count: number;
}

export interface TopReader {
    userId: string;
    name: string;
    email: string;
    chaptersRead: number;
}

export interface UserMetricsData {
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
    monthlyRegistrations: MonthlyRegistration[];
    activeUsers: {
        today: number;
        last7d: number;
        last30d: number;
    };
    topReaders: TopReader[];
}

export interface UserMetricsResponse {
    success: boolean;
    data: UserMetricsData;
}

export interface SeriesByStatus {
    status: string;
    count: number;
}

export interface GenreCount {
    name: string;
    count: number;
}

export interface HistogramBucket {
    bucket: string;
    count: number;
}

export interface ContentMetricsData {
    seriesByStatus: SeriesByStatus[];
    seriesByType: SeriesByStatus[];
    genreDistribution: GenreCount[];
    emptySeries: number;
    chaptersNoPages: number;
    chaptersPerSeries: HistogramBucket[];
}

export interface ContentMetricsResponse {
    success: boolean;
    data: ContentMetricsData;
}

export interface EventCount {
    event: string;
    count: number;
}

export interface RecentError {
    id: string;
    event: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    user: string;
}

export interface ActiveUser {
    userId: string;
    name: string;
    email: string;
    events: number;
}

export interface SystemMetricsData {
    eventsByType: EventCount[];
    totalEvents: number;
    errorRate: number;
    recentErrors: RecentError[];
    rateLimitsLast7d: number;
    topActiveUsers: ActiveUser[];
}

export interface SystemMetricsResponse {
    success: boolean;
    data: SystemMetricsData;
}

export interface ActivityLogEntry {
    id: string;
    userId: string;
    event: string;
    metadata: Record<string, unknown> | null;
    ip: string | null;
    userAgent: string | null;
    createdAt: string;
    user: {
        name: string;
        lastname: string;
        email: string;
    };
}

export interface ActivityLogResponse {
    success: boolean;
    data: ActivityLogEntry[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface AdminAuditLogEntry {
    id: string;
    adminId: string;
    action: string;
    targetId: string | null;
    targetType: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    admin: {
        id: string;
        name: string;
        lastname: string;
        email: string;
    };
}

export interface AdminAuditLogResponse {
    success: boolean;
    data: AdminAuditLogEntry[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
