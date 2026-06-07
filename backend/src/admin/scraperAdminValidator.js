export function updateConfigValidator(req, res, next) {
  const { autoEnabled, intervalMinutes } = req.body;

  const errors = [];

  if (autoEnabled !== undefined && typeof autoEnabled !== "boolean") {
    errors.push("autoEnabled debe ser un booleano");
  }

  if (intervalMinutes !== undefined) {
    if (!Number.isInteger(intervalMinutes) || intervalMinutes < 1 || intervalMinutes > 1440) {
      errors.push("intervalMinutes debe ser un entero entre 1 y 1440");
    }
  }

  if (autoEnabled === undefined && intervalMinutes === undefined) {
    errors.push("Debe proporcionar al menos un campo a actualizar");
  }

  if (errors.length > 0) {
    const err = new Error(errors.join(". "));
    err.statusCode = 400;
    return next(err);
  }

  next();
}
