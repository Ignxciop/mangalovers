import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../utils/validate.js";

const adminAnnouncementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ success: false, message: "Demasiadas solicitudes, intenta de nuevo más tarde" });
  },
});
import {
  listAnnouncementsValidator,
  createAnnouncementValidator,
  updateAnnouncementValidator,
  deleteAnnouncementValidator,
} from "./adminAnnouncementValidator.js";
import {
  listAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "./adminAnnouncementController.js";

const router = Router();

router.use(authenticate, authorize("ADMIN"));
router.use(adminAnnouncementLimiter);

router.get("/announcements", listAnnouncementsValidator, validate, listAnnouncements);
router.get("/announcements/:id", getAnnouncement);
router.post("/announcements", createAnnouncementValidator, validate, createAnnouncement);
router.patch("/announcements/:id", updateAnnouncementValidator, validate, updateAnnouncement);
router.delete("/announcements/:id", deleteAnnouncementValidator, validate, deleteAnnouncement);

export default router;
