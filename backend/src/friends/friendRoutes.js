import { Router } from "express";
import {
  searchUsers, sendRequest, acceptRequest, rejectRequest,
  blockUser, unblockUser, removeFriend,
  getFriends, getReceivedRequests, getSentRequests, getBlockedUsers,
} from "./friendController.js";
import { authenticate } from "../middlewares/auth.js";
import {
  searchUsersValidator, sendRequestValidator, requestIdParamValidator,
  blockUserValidator, unblockUserValidator, userIdParamValidator,
} from "./friendValidator.js";
import { validate } from "../utils/validate.js";

const router = Router();

router.get("/", authenticate, getFriends);
router.get("/requests/received", authenticate, getReceivedRequests);
router.get("/requests/sent", authenticate, getSentRequests);
router.get("/blocked", authenticate, getBlockedUsers);
router.get("/search", authenticate, searchUsersValidator, validate, searchUsers);
router.post("/request", authenticate, sendRequestValidator, validate, sendRequest);
router.patch("/request/:id/accept", authenticate, requestIdParamValidator, validate, acceptRequest);
router.patch("/request/:id/reject", authenticate, requestIdParamValidator, validate, rejectRequest);
router.post("/block", authenticate, blockUserValidator, validate, blockUser);
router.post("/unblock", authenticate, unblockUserValidator, validate, unblockUser);
router.delete("/:userId", authenticate, userIdParamValidator, validate, removeFriend);

export default router;
