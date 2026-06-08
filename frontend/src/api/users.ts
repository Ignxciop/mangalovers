import { api } from "./axios";

export interface PublicUserProfile {
  id: string;
  name: string;
  lastname: string;
  alias: string | null;
  avatarUrl: string | null;
  profileVisibility: "PUBLIC" | "FRIENDS" | "PRIVATE";
  createdAt: string;
  friendCount: number;
  friendStatus: "PENDING" | "ACCEPTED" | "BLOCKED" | null;
  isOwner: boolean;
}

export interface ProfileFavorite {
  id: number;
  seriesId: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  series: {
    id: number;
    name: string;
    slug: string;
    cover: string | null;
    fallbackCover?: string | null;
    status: string | null;
    type: string | null;
    chapterCount: number;
    lastChapterPublishedAt: string | null;
  };
  lastReadChapterName: string | null;
  lastAvailableChapterName: string | null;
}

export interface ProfileActivity {
  id: string;
  userId: string;
  event: "MARK_READ" | "ADD_FAVORITE" | "REMOVE_FAVORITE";
  metadata: {
    chapterId?: number;
    chapterName?: string;
    seriesId?: number;
    seriesName?: string;
  };
  createdAt: string;
  user: {
    id: string;
    name: string;
    lastname: string;
    alias: string | null;
    avatarUrl: string | null;
  };
}

export async function getProfile(alias: string): Promise<PublicUserProfile> {
  const { data } = await api.get<{ success: boolean; data: PublicUserProfile }>(`/users/${alias}`);
  return data.data;
}

export async function getProfileFavorites(alias: string, page = 1, limit = 15): Promise<{ data: ProfileFavorite[]; total: number }> {
  const { data } = await api.get<{ success: boolean; data: ProfileFavorite[]; total: number }>(
    `/users/${alias}/favorites`,
    { params: { page, limit } },
  );
  return { data: data.data, total: data.total };
}

export async function getProfileActivity(alias: string, page = 1, limit = 10): Promise<{ data: ProfileActivity[]; total: number }> {
  const { data } = await api.get<{ success: boolean; data: ProfileActivity[]; total: number }>(
    `/users/${alias}/activity`,
    { params: { page, limit } },
  );
  return { data: data.data, total: data.total };
}
