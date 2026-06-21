import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../utils/validate.js";
import { updateConfigValidator, providerParamValidator, refillChapterValidator } from "./scraperAdminValidator.js";
import {
  handleGetConfig,
  handleUpdateConfig,
  handleTriggerProviderRun,
  handleStopScraper,
  handleGetStatus,
  handleGetMissingPages,
  handleRefillMissingPages,
  handleRefillSingleChapter,
} from "./scraperAdminController.js";

const router = Router();

router.get("/scraper/config", authenticate, authorize("ADMIN"), handleGetConfig);
router.patch("/scraper/config", authenticate, authorize("ADMIN"), updateConfigValidator, validate, handleUpdateConfig);
router.post("/scraper/run/:provider", authenticate, authorize("ADMIN"), providerParamValidator, validate, handleTriggerProviderRun);
router.post("/scraper/stop/:provider", authenticate, authorize("ADMIN"), providerParamValidator, validate, handleStopScraper);
router.get("/scraper/status", authenticate, authorize("ADMIN"), handleGetStatus);
router.get("/scraper/missing-pages", authenticate, authorize("ADMIN"), handleGetMissingPages);
router.post("/scraper/refill-pages/:provider", authenticate, authorize("ADMIN"), providerParamValidator, validate, handleRefillMissingPages);
router.post("/scraper/refill-chapter", authenticate, authorize("ADMIN"), refillChapterValidator, validate, handleRefillSingleChapter);

export default router;
