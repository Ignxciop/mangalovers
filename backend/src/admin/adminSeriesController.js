import { AdminSeriesService } from "./adminSeriesService.js";

export async function listSeries(req, res, next) {
  try {
    const { page, limit, search, provider } = req.query;
    const result = await AdminSeriesService.listSeries({
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 20, 50),
      search,
      provider,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getSeries(req, res, next) {
  try {
    const series = await AdminSeriesService.getSeries(parseInt(req.params.id));
    res.json({ success: true, data: series });
  } catch (error) {
    next(error);
  }
}

export async function mergeSeries(req, res, next) {
  try {
    const { keepId, dropId } = req.body;
    const result = await AdminSeriesService.merge(
      parseInt(keepId),
      parseInt(dropId),
      req.user?.userId,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function createRelation(req, res, next) {
  try {
    const { primarySeriesId, fallbackSeriesId } = req.body;
    const relation = await AdminSeriesService.createRelation(
      parseInt(primarySeriesId),
      parseInt(fallbackSeriesId),
    );
    res.status(201).json({ success: true, data: relation });
  } catch (error) {
    next(error);
  }
}

export async function deleteRelation(req, res, next) {
  try {
    await AdminSeriesService.deleteRelation(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function toggleVisibility(req, res, next) {
  try {
    const result = await AdminSeriesService.toggleVisibility(parseInt(req.params.id));
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function addAlias(req, res, next) {
  try {
    const { alias } = req.body;
    const record = await AdminSeriesService.addAlias(
      parseInt(req.params.id),
      alias,
    );
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
}

export async function deleteAlias(req, res, next) {
  try {
    await AdminSeriesService.deleteAlias(parseInt(req.params.aliasId));
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
