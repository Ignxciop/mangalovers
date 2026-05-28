import { FriendService } from "./friendService.js";
import { ActivityLogService } from "../activityLog/activityLogService.js";
import logger from "../config/logger.js";

function logActivity(userId, event, metadata, req) {
  ActivityLogService.logEvent(
    userId, event, metadata,
    req.ip, req.headers["user-agent"],
  ).catch((err) => logger.warn({ err, userId, event }, "ActivityLog error"));
}

export async function searchUsers(req, res, next) {
  try {
    const users = await FriendService.searchUsers(req.query.q, req.user.userId);
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
}

export async function sendRequest(req, res, next) {
  try {
    const friend = await FriendService.sendRequest(req.user.userId, req.body.receiverId);
    res.status(201).json({ success: true, data: friend });
    logActivity(req.user.userId, "SEND_FRIEND_REQUEST", { receiverId: req.body.receiverId }, req);
  } catch (error) {
    next(error);
  }
}

export async function acceptRequest(req, res, next) {
  try {
    const friend = await FriendService.acceptRequest(req.user.userId, Number(req.params.id));
    res.json({ success: true, data: friend });
    logActivity(req.user.userId, "ACCEPT_FRIEND", { requestId: req.params.id }, req);
  } catch (error) {
    next(error);
  }
}

export async function rejectRequest(req, res, next) {
  try {
    await FriendService.rejectRequest(req.user.userId, Number(req.params.id));
    res.json({ success: true, message: "Solicitud rechazada" });
    logActivity(req.user.userId, "REJECT_FRIEND", { requestId: req.params.id }, req);
  } catch (error) {
    next(error);
  }
}

export async function blockUser(req, res, next) {
  try {
    const friend = await FriendService.blockUser(req.user.userId, req.body.userId);
    res.json({ success: true, data: friend, message: "Usuario bloqueado" });
    logActivity(req.user.userId, "BLOCK_USER", { targetUserId: req.body.userId }, req);
  } catch (error) {
    next(error);
  }
}

export async function unblockUser(req, res, next) {
  try {
    await FriendService.unblockUser(req.user.userId, req.body.userId);
    res.json({ success: true, message: "Usuario desbloqueado" });
    logActivity(req.user.userId, "UNBLOCK_USER", { targetUserId: req.body.userId }, req);
  } catch (error) {
    next(error);
  }
}

export async function removeFriend(req, res, next) {
  try {
    await FriendService.removeFriend(req.user.userId, req.params.userId);
    res.json({ success: true, message: "Amigo eliminado" });
  } catch (error) {
    next(error);
  }
}

export async function getFriends(req, res, next) {
  try {
    const friends = await FriendService.getFriends(req.user.userId);
    res.json({ success: true, data: friends });
  } catch (error) {
    next(error);
  }
}

export async function getReceivedRequests(req, res, next) {
  try {
    const requests = await FriendService.getReceivedRequests(req.user.userId);
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
}

export async function getSentRequests(req, res, next) {
  try {
    const requests = await FriendService.getSentRequests(req.user.userId);
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
}

export async function getFriendReadsForSeries(req, res, next) {
  try {
    const reads = await FriendService.getFriendReadsForSeries(req.user.userId, req.params.seriesId);
    res.json({ success: true, data: reads });
  } catch (error) {
    next(error);
  }
}

export async function getBlockedUsers(req, res, next) {
  try {
    const blocked = await FriendService.getBlockedUsers(req.user.userId);
    res.json({ success: true, data: blocked });
  } catch (error) {
    next(error);
  }
}

export async function getSeriesActivity(req, res, next) {
  try {
    const ids = req.query.seriesIds.split(",").map(Number);
    const activity = await FriendService.getSeriesActivity(req.user.userId, ids);
    res.json({ success: true, data: activity });
  } catch (error) {
    next(error);
  }
}
