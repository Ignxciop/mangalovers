import { api } from "./axios";
import type {
    AdminUserListResponse, UpdateRoleResponse, UpdateStatusResponse,
    AdminMetricsResponse, ActivityLogResponse, ActivityLogEntry, UserRole, UserStatus,
    OverviewResponse, ScraperMetricsResponse, UserMetricsResponse,
    ContentMetricsResponse, SystemMetricsResponse,
    UserStatusHistoryResponse,
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
