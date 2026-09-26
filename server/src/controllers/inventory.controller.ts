import type { Request, Response } from 'express';
import { currentUser } from '../middlewares/auth';
import * as dashboard from '../services/dashboard.service';
import * as moves from '../services/move.service';
import * as stock from '../services/stock.service';
import { format } from '../utils/format';
import { sendSuccess } from '../utils/response';

type Paged<T> = T & { page: number; limit: number };

// ── Stock ──────────────────────────────────────────────────────────────────

export async function listStock(req: Request, res: Response) {
  const q = req.query as unknown as Paged<stock.StockFilters & { sort?: string }>;
  const { items, total, summary } = await stock.listStock(q);
  sendSuccess(res, items, { meta: { page: q.page, limit: q.limit, total, summary } });
}

export async function productLocations(req: Request, res: Response) {
  sendSuccess(res, await stock.productLocations(req.params.productId!, req.query.warehouse as string | undefined));
}

export async function adjust(req: Request, res: Response) {
  const u = currentUser(req);
  const result = await stock.adjustStock(req.params.productId!, req.body, { id: u.id, name: u.name });
  sendSuccess(res, result, { message: `Stock updated (${result.difference > 0 ? '+' : ''}${result.difference})` });
}

// ── Moves ──────────────────────────────────────────────────────────────────

export async function listMoves(req: Request, res: Response) {
  const q = req.query as unknown as Paged<moves.MoveFilters>;
  const { items, total, totals } = await moves.listMoves(q);
  sendSuccess(res, items, { meta: { page: q.page, limit: q.limit, total, totals } });
}

export async function movesKanban(req: Request, res: Response) {
  sendSuccess(res, await moves.movesKanban(req.query as unknown as moves.MoveFilters));
}

export async function exportCsv(req: Request, res: Response) {
  const csv = await moves.exportMovesCsv(req.query as unknown as moves.MoveFilters);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="stocksense-moves-${format.date(new Date()).replace(/\//g, '-')}.csv"`);
  // BOM so Excel opens UTF-8 (₹, names) correctly.
  res.send(`${String.fromCharCode(0xfeff)}${csv}`);
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export async function summary(req: Request, res: Response) {
  sendSuccess(res, await dashboard.summary(req.query as dashboard.DashboardFilters));
}

export async function charts(req: Request, res: Response) {
  sendSuccess(res, await dashboard.charts(req.query as unknown as { days: number; warehouse?: string; category?: string }));
}

export async function recent(req: Request, res: Response) {
  sendSuccess(res, await dashboard.recent(req.query as dashboard.DashboardFilters));
}
