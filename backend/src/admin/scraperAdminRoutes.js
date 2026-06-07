import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { authorize } from "../middlewares/authorize.js";
import { updateConfigValidator, providerParamValidator } from "./scraperAdminValidator.js";
import {
  handleGetConfig,
  handleUpdateConfig,
  handleTriggerProviderRun,
  handleGetStatus,
} from "./scraperAdminController.js";

const router = Router();

router.get("/scraper/config", authenticate, authorize("ADMIN"), handleGetConfig);
router.patch("/scraper/config", authenticate, authorize("ADMIN"), updateConfigValidator, handleUpdateConfig);
router.post("/scraper/run/:provider", authenticate, authorize("ADMIN"), providerParamValidator, handleTriggerProviderRun);
router.get("/scraper/status", authenticate, authorize("ADMIN"), handleGetStatus);

export default router;
