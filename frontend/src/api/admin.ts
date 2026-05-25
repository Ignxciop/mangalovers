import { api } from "./axios";
import type { AdminUserListResponse, UpdateRoleResponse, AdminMetricsResponse, UserRole } from "@/types/admin";

export async function getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
}) {
    const { data } = await api.get<AdminUserListResponse>("/admin/users", { params });
    return data;
}

export async function updateUserRole(userId: string, role: UserRole) {
    const { data } = await api.patch<UpdateRoleResponse>(`/admin/users/${userId}/role`, { role });
    return data;
}

export async function getMetrics() {
    const { data } = await api.get<AdminMetricsResponse>("/admin/metrics");
    return data;
}
