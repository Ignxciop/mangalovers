import { api } from "./axios";
import type {
    AdminUserListResponse, UpdateRoleResponse, UpdateStatusResponse,
    AdminMetricsResponse, ActivityLogResponse, ActivityLogEntry, UserRole, UserStatus,
    OverviewResponse, ScraperMetricsResponse, UserMetricsResponse,
    ContentMetricsResponse, SystemMetricsResponse,
    UserStatusHistoryResponse,
    AdminSeriesListResponse, AdminSeriesDetailResponse,
    ScraperConfigResponse, ScraperStatusResponse, ScraperRunResponse,
} from "@/types/admin";

export async function getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    status?: UserStatus;
}) {
    const { data } = await api.get<AdminUserListResponse>("/admin/users", { params });
    return data;
}

export async function updateUserRole(userId: string, role: UserRole) {
    const { data } = await api.patch<UpdateRoleResponse>(`/admin/users/${userId}/role`, { role });
    return data;
}

export async function updateUserStatus(userId: string, status: UserStatus, suspendedUntil?: string | null) {
    const body: Record<string, unknown> = { status };
    if (suspendedUntil !== undefined) body.suspendedUntil = suspendedUntil;
    const { data } = await api.patch<UpdateStatusResponse>(`/admin/users/${userId}/status`, body);
    return data;
}

export async function getUserStatusHistory(userId: string) {
    const { data } = await api.get<UserStatusHistoryResponse>(`/admin/users/${userId}/status-history`);
    return data;
}

export async function getMetrics() {
    const { data } = await api.get<AdminMetricsResponse>("/admin/metrics");
    return data;
}

export async function getMetricsOverview() {
    const { data } = await api.get<OverviewResponse>("/admin/metrics/overview");
    return data;
}

export async function getScraperMetrics() {
    const { data } = await api.get<ScraperMetricsResponse>("/admin/metrics/scrapers");
    return data;
}

export async function getUserMetrics() {
    const { data } = await api.get<UserMetricsResponse>("/admin/metrics/users");
    return data;
}

export async function getContentMetrics() {
    const { data } = await api.get<ContentMetricsResponse>("/admin/metrics/content");
    return data;
}

export async function getSystemMetrics() {
    const { data } = await api.get<SystemMetricsResponse>("/admin/metrics/system");
    return data;
}

export async function getActivityLogs(params?: {
    page?: number;
    limit?: number;
    event?: string;
    userId?: string;
    search?: string;
}) {
    const { data } = await api.get<ActivityLogResponse>("/admin/logs", { params });
    return data;
}

export async function getStatusHistory(userId: string, limit = 10) {
    const { data } = await api.get<{ success: boolean; data: ActivityLogEntry[] }>(`/admin/users/${userId}/status-history`, { params: { limit } });
    return data;
}

export async function getAdminSeries(params?: { page?: number; limit?: number; search?: string; provider?: string }) {
    const { data } = await api.get<AdminSeriesListResponse>("/admin/series", { params });
    return data;
}

export async function getAdminSeriesDetail(id: number) {
    const { data } = await api.get<AdminSeriesDetailResponse>(`/admin/series/${id}`);
    return data;
}

export async function adminMergeSeries(keepId: number, dropId: number) {
    const { data } = await api.post("/admin/series/merge", { keepId, dropId });
    return data;
}

export async function adminCreateSeriesRelation(primarySeriesId: number, fallbackSeriesId: number) {
    const { data } = await api.post("/admin/series/relation", { primarySeriesId, fallbackSeriesId });
    return data;
}

export async function adminDeleteSeriesRelation(id: number) {
    const { data } = await api.delete(`/admin/series/relation/${id}`);
    return data;
}

export async function adminAddAlias(seriesId: number, alias: string) {
    const { data } = await api.post(`/admin/series/${seriesId}/alias`, { alias });
    return data;
}

export async function adminDeleteAlias(seriesId: number, aliasId: number) {
    const { data } = await api.delete(`/admin/series/${seriesId}/alias/${aliasId}`);
    return data;
}

export async function adminToggleSeriesVisibility(id: number) {
    const { data } = await api.patch(`/admin/series/${id}/visibility`);
    return data;
}

export async function getScraperConfig() {
    const { data } = await api.get<ScraperConfigResponse>("/admin/scraper/config");
    return data;
}

export async function updateScraperConfig(body: { autoEnabled?: boolean; intervalMinutes?: number; enabledProviders?: string[] }) {
    const { data } = await api.patch<ScraperConfigResponse>("/admin/scraper/config", body);
    return data;
}

export async function triggerScraperRun() {
    const { data } = await api.post<ScraperRunResponse>("/admin/scraper/run");
    return data;
}

export async function getScraperStatus() {
    const { data } = await api.get<ScraperStatusResponse>("/admin/scraper/status");
    return data;
}

export interface MissingPagesData {
    providers: { provider: string; count: number }[];
    total: number;
}

export async function getMissingPages() {
    const { data } = await api.get<{ success: boolean; data: MissingPagesData }>("/admin/scraper/missing-pages");
    return data;
}

export async function refillMissingPages(provider: string) {
    const { data } = await api.post<{ success: boolean; data: { reset: number; message?: string } }>(`/admin/scraper/refill-pages/${provider}`);
    return data;
}

export async function fixEmptyChapters() {
    const { data } = await api.post<{ success: boolean; data: { count: number; message: string } }>("/admin/tools/fix-empty-chapters");
    return data;
}
