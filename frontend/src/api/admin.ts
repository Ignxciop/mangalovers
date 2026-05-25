import { api } from "./axios";
import type { AdminUserListResponse, UpdateRoleResponse, UpdateStatusResponse, AdminMetricsResponse, ActivityLogResponse, UserRole, UserStatus } from "@/types/admin";

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

export async function updateUserStatus(userId: string, status: UserStatus) {
    const { data } = await api.patch<UpdateStatusResponse>(`/admin/users/${userId}/status`, { status });
    return data;
}

export async function getMetrics() {
    const { data } = await api.get<AdminMetricsResponse>("/admin/metrics");
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
