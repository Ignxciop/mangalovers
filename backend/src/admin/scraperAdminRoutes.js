import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
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
router.patch("/scraper/config", authenticate, authorize("ADMIN"), updateConfigValidator, handleUpdateConfig);
router.post("/scraper/run/:provider", authenticate, authorize("ADMIN"), providerParamValidator, handleTriggerProviderRun);
router.post("/scraper/stop/:provider", authenticate, authorize("ADMIN"), providerParamValidator, handleStopScraper);
router.get("/scraper/status", authenticate, authorize("ADMIN"), handleGetStatus);
router.get("/scraper/missing-pages", authenticate, authorize("ADMIN"), handleGetMissingPages);
router.post("/scraper/refill-pages/:provider", authenticate, authorize("ADMIN"), providerParamValidator, handleRefillMissingPages);
router.post("/scraper/refill-chapter", authenticate, authorize("ADMIN"), refillChapterValidator, handleRefillSingleChapter);

export default router;
