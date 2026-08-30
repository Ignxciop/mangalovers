export type UserRole = "ADMIN" | "USER";
export type UserStatus = "ACTIVE" | "BANNED" | "SUSPENDED";

export interface AdminUser {
    id: string;
    email: string;
    name: string;
    lastname: string;
    role: UserRole;
    status: UserStatus;
    suspendedUntil: string | null;
    lastLoginAt: string | null;
    createdAt: string;
    avatarUrl?: string | null;
    _count: {
        suggestions: number;
        favorites: number;
        chapterReads: number;
        comments: number;
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
        suspendedUntil: string | null;
        lastLoginAt: string | null;
        createdAt: string;
        avatarUrl?: string | null;
    };
}

export interface UpdateStatusResponse {
    success: boolean;
    message: string;
    data: {
        id: string;
        email: string;
        name: string;
        lastname: string;
        role: UserRole;
        status: UserStatus;
        suspendedUntil: string | null;
        lastLoginAt: string | null;
        createdAt: string;
        avatarUrl?: string | null;
    };
}

export interface UserStatusHistory {
    suspensionCount: number;
    lastSuspension: string | null;
    banCount: number;
    lastBan: string | null;
}

export interface UserStatusHistoryResponse {
    success: boolean;
    data: UserStatusHistory;
}

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
        avatarUrl?: string | null;
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

export interface AdminProviderRef {
    id: number;
    provider: { name: string; priority: number };
    externalId: string;
    slug: string;
    enabled: boolean;
}

export interface AdminChapter {
    id: number;
    number: number | null;
    name: string;
    publishedAt: string;
    pagesScraped: boolean;
    pagesCount: number;
    providers: string[];
    createdAt: string;
}

export interface AdminSeriesRelation {
    id: number;
    fallbackSeries: { id: number; name: string; slug: string; cover?: string | null };
}

export interface AdminSeriesItem {
    id: number;
    name: string;
    slug: string;
    visible: boolean;
    providerSeries: AdminProviderRef[];
    primaryRelations: AdminSeriesRelation[];
    fallbackRelations: { id: number; primarySeries: { id: number; name: string; slug: string } }[];
    _count: { chapters: number };
}

export interface AdminSeriesListResponse {
    success: boolean;
    total: number;
    page: number;
    limit: number;
    data: AdminSeriesItem[];
}

export interface AdminSeriesDetail extends AdminSeriesItem {
    cover: string | null;
    status: string | null;
    summary: string | null;
    type: string | null;
    chapterCount: number;
    aliases: { id: number; alias: string }[];
}

export interface AdminSeriesDetailResponse {
    success: boolean;
    data: AdminSeriesDetail;
}

export interface AdminChaptersResponse {
    success: boolean;
    chapters: AdminChapter[];
    total: number;
    page: number;
    totalPages: number;
}

export interface AdminBulkDeleteResponse {
    success: boolean;
    data: { deleted: number };
}

export interface AdminToggleProviderResponse {
    success: boolean;
    data: { id: number; enabled: boolean };
}

export interface ScraperConfig {
    id: number;
    autoEnabled: boolean;
    intervalMinutes: number;
    enabledProviders: string[];
    updatedAt: string;
}

export interface ScraperConfigResponse {
    success: boolean;
    data: ScraperConfig;
}

export interface ScraperProviderStatus {
    name: string;
    enabled: boolean;
    isRunning: boolean;
    lastRun: ScraperRun | null;
}

export interface ScraperStatusData {
    isRunning: boolean;
    autoEnabled: boolean;
    intervalMinutes: number;
    enabledProviders: string[];
    providers: ScraperProviderStatus[];
}

export interface ScraperStatusResponse {
    success: boolean;
    data: ScraperStatusData;
}

export interface ScraperRunResponse {
    success: boolean;
    message: string;
}

export type ReportReason = "OFFENSIVE_LANGUAGE" | "UNMARKED_SPOILER" | "OTHER";
export type ReportStatus = "PENDING" | "REVIEWED" | "DISMISSED" | "RESOLVED";

export interface CommentReport {
    id: number;
    commentId: number | null;
    reason: ReportReason;
    description: string | null;
    status: ReportStatus;
    createdAt: string;
    resolvedAt: string | null;
    adminNote: string | null;
    reporter: {
        id: string;
        name: string;
        lastname: string;
        alias: string | null;
        avatarUrl: string | null;
    } | null;
    resolvedBy: {
        id: string;
        name: string;
        lastname: string;
    } | null;
    comment: {
        id: number;
        content: string;
        isSpoiler: boolean;
        chapterId: number | null;
        seriesId: number | null;
        series: { slug: string; name: string } | null;
        chapter: { name: string } | null;
        user: { id: string; alias: string | null } | null;
    } | null;
}

export interface ReportsListResponse {
    success: boolean;
    data: CommentReport[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface ReportCreateResponse {
    success: boolean;
    data: CommentReport;
}

export interface PendingCountResponse {
    success: boolean;
    count: number;
}

export interface ChatReport {
    id: number;
    messageId: number | null;
    reason: ReportReason;
    description: string | null;
    status: ReportStatus;
    createdAt: string;
    resolvedAt: string | null;
    adminNote: string | null;
    reporter: {
        id: string;
        name: string;
        lastname: string;
        alias: string | null;
        avatarUrl: string | null;
    } | null;
    resolvedBy: {
        id: string;
        name: string;
        lastname: string;
    } | null;
    message: {
        id: number;
        content: string;
        isSpoiler: boolean;
        visible: boolean;
        createdAt: string;
        user: { id: string; alias: string | null } | null;
    } | null;
}

export interface ChatReportsListResponse {
    success: boolean;
    data: ChatReport[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface ChatReportCreateResponse {
    success: boolean;
    data: ChatReport;
}

export interface ChatResolveResponse {
    success: boolean;
    data: ChatReport;
}

export interface ChatDeleteMessageResponse {
    success: boolean;
    data: { id: number };
}

export interface ChatMuteResponse {
    success: boolean;
    data: {
        userId: string;
        mutedUntil: string | null;
        reason: string | null;
    };
}

export interface ChatUnmuteResponse {
    success: boolean;
    data: { userId: string };
}

