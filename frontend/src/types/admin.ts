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
        createdAt: string;
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
        createdAt: string;
    };
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
