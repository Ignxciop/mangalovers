import { api } from "./axios";

interface FriendUser {
  id: string;
  name: string;
  lastname: string;
  alias: string | null;
  avatarUrl: string | null;
}

export interface Friend extends FriendUser {
  friendshipId: number;
  friendSince: string;
}

export interface FriendRequest {
  id: number;
  sender: FriendUser;
  createdAt: string;
}

export interface SentRequest {
  id: number;
  receiver: FriendUser;
  createdAt: string;
}

export interface BlockedUser {
  id: number;
  user: FriendUser;
  blockedAt: string;
}

export interface SearchUserResult extends FriendUser {
  _friendStatus: "PENDING" | "ACCEPTED" | "BLOCKED" | null;
}

export async function getFriends(): Promise<Friend[]> {
  const { data } = await api.get<{ success: boolean; data: Friend[] }>("/friends");
  return data.data;
}

export async function getReceivedRequests(): Promise<FriendRequest[]> {
  const { data } = await api.get<{ success: boolean; data: FriendRequest[] }>("/friends/requests/received");
  return data.data;
}

export async function getSentRequests(): Promise<SentRequest[]> {
  const { data } = await api.get<{ success: boolean; data: SentRequest[] }>("/friends/requests/sent");
  return data.data;
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const { data } = await api.get<{ success: boolean; data: BlockedUser[] }>("/friends/blocked");
  return data.data;
}

export async function searchUsers(query: string): Promise<SearchUserResult[]> {
  const { data } = await api.get<{ success: boolean; data: SearchUserResult[] }>("/friends/search", {
    params: { q: query },
  });
  return data.data;
}

export async function sendRequest(receiverId: string): Promise<void> {
  await api.post("/friends/request", { receiverId });
}

export async function acceptRequest(id: number): Promise<void> {
  await api.patch(`/friends/request/${id}/accept`);
}

export async function rejectRequest(id: number): Promise<void> {
  await api.patch(`/friends/request/${id}/reject`);
}

export async function blockUser(userId: string): Promise<void> {
  await api.post("/friends/block", { userId });
}

export async function unblockUser(userId: string): Promise<void> {
  await api.post("/friends/unblock", { userId });
}

export async function removeFriend(userId: string): Promise<void> {
  await api.delete(`/friends/${userId}`);
}

export interface FriendSeriesRead {
  userId: string;
  name: string;
  lastname: string;
  alias: string | null;
  avatarUrl: string | null;
  chapterId: number;
  chapterNumber: number;
  chapterName: string;
  readAt: string;
}

export async function getFriendReadsForSeries(seriesId: number): Promise<FriendSeriesRead[]> {
  const { data } = await api.get<{ success: boolean; data: FriendSeriesRead[] }>(`/friends/series/${seriesId}/reads`);
  return data.data;
}

export interface SimpleFriend {
  userId: string;
  name: string;
  lastname: string;
  alias: string | null;
  avatarUrl: string | null;
}

export async function getSeriesActivity(seriesIds: number[]): Promise<Record<number, SimpleFriend[]>> {
  if (seriesIds.length === 0) return {};
  const { data } = await api.get<{ success: boolean; data: Record<number, SimpleFriend[]> }>(
    "/friends/series-activity",
    { params: { seriesIds: seriesIds.join(",") } },
  );
  return data.data;
}
