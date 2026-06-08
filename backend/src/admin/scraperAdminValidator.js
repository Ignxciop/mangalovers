const VALID_PROVIDERS = ["olympus", "manhwaweb", "leermangaesp"];

export function updateConfigValidator(req, res, next) {
  const { autoEnabled, intervalMinutes, enabledProviders } = req.body;

  const errors = [];

  if (autoEnabled !== undefined && typeof autoEnabled !== "boolean") {
    errors.push("autoEnabled debe ser un booleano");
  }

  if (intervalMinutes !== undefined) {
    if (!Number.isInteger(intervalMinutes) || intervalMinutes < 1 || intervalMinutes > 1440) {
      errors.push("intervalMinutes debe ser un entero entre 1 y 1440");
    }
  }

  if (enabledProviders !== undefined) {
    if (!Array.isArray(enabledProviders) || enabledProviders.length === 0) {
      errors.push("enabledProviders debe ser un arreglo con al menos un proveedor");
    } else {
      for (const p of enabledProviders) {
        if (!VALID_PROVIDERS.includes(p)) {
          errors.push(`Proveedor inválido: ${p}. Válidos: ${VALID_PROVIDERS.join(", ")}`);
        }
      }
    }
  }

  if (autoEnabled === undefined && intervalMinutes === undefined && enabledProviders === undefined) {
    errors.push("Debe proporcionar al menos un campo a actualizar");
  }

  if (errors.length > 0) {
    const err = new Error(errors.join(". "));
    err.statusCode = 400;
    return next(err);
  }

  next();
}

export function providerParamValidator(req, res, next) {
  const { provider } = req.params;

  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    const err = new Error(`Proveedor inválido. Válidos: ${VALID_PROVIDERS.join(", ")}`);
    err.statusCode = 400;
    return next(err);
  }

  next();
}
