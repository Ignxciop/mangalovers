import { api } from "./axios";
import type {
  AnnouncementListResponse,
  AnnouncementResponse,
  CreateAnnouncementPayload,
  UpdateAnnouncementPayload,
} from "@/types/announcement";

export async function getAnnouncements(params?: {
  page?: number;
  limit?: number;
  search?: string;
  active?: string;
}) {
  const { data } = await api.get<AnnouncementListResponse>("/admin/announcements", { params });
  return data;
}

export async function getAnnouncement(id: number) {
  const { data } = await api.get<AnnouncementResponse>(`/admin/announcements/${id}`);
  return data;
}

export async function createAnnouncement(payload: CreateAnnouncementPayload) {
  const { data } = await api.post<AnnouncementResponse>("/admin/announcements", payload);
  return data;
}

export async function updateAnnouncement(id: number, payload: UpdateAnnouncementPayload) {
  const { data } = await api.patch<AnnouncementResponse>(`/admin/announcements/${id}`, payload);
  return data;
}

export async function deleteAnnouncement(id: number) {
  const { data } = await api.delete(`/admin/announcements/${id}`);
  return data;
}

export async function fetchPendingAnnouncements(seenIds: number[]) {
  const params = seenIds.length > 0 ? { seen: seenIds.join(",") } : {};
  const { data } = await api.get<{ success: boolean; data: import("@/types/announcement").Announcement[] }>(
    "/announcements/pending", { params }
  );
  return data.data;
}

export async function dismissAnnouncement(id: number) {
  const { data } = await api.post(`/announcements/${id}/dismiss`);
  return data;
}
