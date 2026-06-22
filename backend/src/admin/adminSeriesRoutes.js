import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../utils/validate.js";
import {
  listSeriesValidator,
  seriesIdParamValidator,
  mergeSeriesValidator,
  createRelationValidator,
  relationIdParamValidator,
  aliasBodyValidator,
  deleteAliasValidator,
  chaptersQueryValidator,
  bulkDeleteChaptersValidator,
  toggleProviderSeriesValidator,
} from "./adminSeriesValidator.js";
import {
  listSeries,
  getSeries,
  mergeSeries,
  createRelation,
  deleteRelation,
  toggleVisibility,
  addAlias,
  deleteAlias,
  handleGetChapters,
  handleBulkDeleteChapters,
  handleToggleProviderSeries,
} from "./adminSeriesController.js";
import { ActivityLogService } from "../activityLog/activityLogService.js";

const isDev = process.env.NODE_ENV !== "production";

const seriesLimiter = isDev
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 50,
      standardHeaders: true,
      legacyHeaders: false,
      handler: async (req, res) => {
        if (req.user?.userId) {
          try {
            await ActivityLogService.logEvent(
              req.user.userId, "RATE_LIMIT",
              { route: req.originalUrl, method: req.method },
              req.ip, req.headers["user-agent"],
            );
          } catch { /* ignore */ }
        }
        res.status(429).json({ success: false, message: "Demasiadas solicitudes, intenta de nuevo más tarde" });
      },
    });

const router = Router();

router.get("/series", seriesLimiter, authenticate, authorize("ADMIN"), listSeriesValidator, validate, listSeries);
router.get("/series/:id", authenticate, authorize("ADMIN"), seriesIdParamValidator, validate, getSeries);
router.post("/series/merge", authenticate, authorize("ADMIN"), mergeSeriesValidator, validate, mergeSeries);
router.post("/series/relation", authenticate, authorize("ADMIN"), createRelationValidator, validate, createRelation);
router.delete("/series/relation/:id", authenticate, authorize("ADMIN"), relationIdParamValidator, validate, deleteRelation);
router.patch("/series/:id/visibility", authenticate, authorize("ADMIN"), seriesIdParamValidator, validate, toggleVisibility);
router.post("/series/:id/alias", authenticate, authorize("ADMIN"), aliasBodyValidator, validate, addAlias);
router.delete("/series/:id/alias/:aliasId", authenticate, authorize("ADMIN"), deleteAliasValidator, validate, deleteAlias);

router.get("/series/:id/chapters", authenticate, authorize("ADMIN"), chaptersQueryValidator, validate, handleGetChapters);
router.post("/chapters/bulk-delete", authenticate, authorize("ADMIN"), bulkDeleteChaptersValidator, validate, handleBulkDeleteChapters);
router.patch("/series/:seriesId/provider-series/:psId/toggle", authenticate, authorize("ADMIN"), toggleProviderSeriesValidator, validate, handleToggleProviderSeries);

export default router;
