export function attachLogger(req, res, next) {
  if (req.log) {
    req.log = req.log.child({
      userId: req.user?.userId,
      route: req.originalUrl,
    });
  }
  next();
}
