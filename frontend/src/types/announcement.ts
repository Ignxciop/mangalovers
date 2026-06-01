export interface Announcement {
  id: number;
  title: string;
  body: string;
  active: boolean;
  publishAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  _count?: { seenBy: number };
}

export interface AnnouncementListResponse {
  success: boolean;
  data: Announcement[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AnnouncementResponse {
  success: boolean;
  data: Announcement;
}

export interface CreateAnnouncementPayload {
  title: string;
  body: string;
  active?: boolean;
  publishAt?: string;
  expiresAt?: string;
}

export interface UpdateAnnouncementPayload {
  title?: string;
  body?: string;
  active?: boolean;
  publishAt?: string;
  expiresAt?: string;
}
