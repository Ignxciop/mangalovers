import { body, param } from "express-validator";

const VALID_PROVIDERS = ["olympus", "manhwaweb", "leermangaesp"];

export const updateConfigValidator = [
  body("autoEnabled")
    .optional()
    .isBoolean().withMessage("autoEnabled debe ser un booleano"),
  body("intervalMinutes")
    .optional()
    .isInt({ min: 1, max: 1440 }).withMessage("intervalMinutes debe ser un entero entre 1 y 1440"),
  body("enabledProviders")
    .optional()
    .isArray({ min: 1 }).withMessage("enabledProviders debe ser un arreglo con al menos un proveedor"),
  body("enabledProviders.*")
    .optional()
    .isIn(VALID_PROVIDERS).withMessage(`Proveedor inválido. Válidos: ${VALID_PROVIDERS.join(", ")}`),
  body().custom((_, { req }) => {
    if (req.body.autoEnabled === undefined && req.body.intervalMinutes === undefined && req.body.enabledProviders === undefined) {
      throw new Error("Debe proporcionar al menos un campo a actualizar");
    }
    return true;
  }),
];

export const providerParamValidator = [
  param("provider")
    .isIn(VALID_PROVIDERS).withMessage(`Proveedor inválido. Válidos: ${VALID_PROVIDERS.join(", ")}`),
];

export const refillChapterValidator = [
  body("chapterId")
    .toInt()
    .isInt({ min: 1 }).withMessage("chapterId debe ser un entero positivo"),
];
