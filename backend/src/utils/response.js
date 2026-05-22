export function success(res, data = null, message = null, statusCode = 200) {
  const body = { success: true };
  if (message) body.message = message;
  if (data !== null) body.data = data;
  return res.status(statusCode).json(body);
}

export function created(res, data = null, message = null) {
  return success(res, data, message, 201);
}

export function successPaginated(res, data, meta, message = null) {
  const body = { success: true, data, meta };
  if (message) body.message = message;
  return res.status(200).json(body);
}
