import type { Request, Response } from 'express';
import { currentUser, hasRole } from '../middlewares/auth';
import * as ops from '../services/operation.service';
import { renderOperationPdf } from '../services/print.service';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/response';

const actor = (req: Request) => {
  const u = currentUser(req);
  return { id: u.id, name: u.name };
};

export async function list(req: Request, res: Response) {
  const q = req.query as unknown as ops.ListFilters;
  const { items, total, statusCounts } = await ops.listOperations(q);
  sendSuccess(res, items, { meta: { page: q.page, limit: q.limit, total, statusCounts } });
}

export async function kanban(req: Request, res: Response) {
  sendSuccess(res, await ops.kanban(req.query as unknown as ops.ListFilters));
}

export async function create(req: Request, res: Response) {
  const body = req.body as ops.OperationInput | (ops.AdjustmentInput & { type: 'adjustment' });
  if (body.type === 'adjustment') {
    // Adjustments change stock directly — managers and admins only.
    if (!hasRole(currentUser(req).role, 'manager')) throw ApiError.forbidden('Only managers can post inventory adjustments');
    const result = await ops.applyAdjustment(body, actor(req));
    return sendSuccess(res, result.operation, { status: 201, message: `Adjustment ${result.difference > 0 ? '+' : ''}${result.difference} applied` });
  }
  sendSuccess(res, await ops.createOperation(body, actor(req)), { status: 201, message: 'Operation created' });
}

export async function get(req: Request, res: Response) {
  sendSuccess(res, await ops.getOperation(req.params.id!));
}

export async function update(req: Request, res: Response) {
  sendSuccess(res, await ops.updateOperation(req.params.id!, req.body), { message: 'Operation saved' });
}

export async function todo(req: Request, res: Response) {
  sendSuccess(res, await ops.markTodo(req.params.id!), { message: 'Marked as Ready' });
}

export async function checkAvailability(req: Request, res: Response) {
  const { operation, status } = await ops.checkAvailability(req.params.id!);
  sendSuccess(res, operation, { message: status === 'ready' ? 'All products available — stock reserved' : 'Some products are short — delivery is Waiting' });
}

export async function pick(req: Request, res: Response) {
  sendSuccess(res, await ops.setPicked(req.params.id!, req.body?.value ?? true));
}

export async function pack(req: Request, res: Response) {
  sendSuccess(res, await ops.setPacked(req.params.id!, req.body?.value ?? true));
}

export async function validate(req: Request, res: Response) {
  sendSuccess(res, await ops.validateOperation(req.params.id!, actor(req)), { message: 'Validated' });
}

export async function cancel(req: Request, res: Response) {
  sendSuccess(res, await ops.cancelOperation(req.params.id!), { message: 'Operation canceled' });
}

export async function setStatus(req: Request, res: Response) {
  sendSuccess(res, await ops.moveToStatus(req.params.id!, req.body.status, actor(req)));
}

export async function print(req: Request, res: Response) {
  const { buffer, filename } = await renderOperationPdf(req.params.id!);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.send(buffer);
}
