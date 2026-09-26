import { Router } from 'express';
import mongoose from 'mongoose';
import * as inv from '../controllers/inventory.controller';
import * as m from '../controllers/master.controller';
import * as op from '../controllers/operation.controller';
import * as u from '../controllers/user.controller';
import { authenticate, requireRole } from '../middlewares/auth';
import { avatarUpload } from '../middlewares/upload';
import { validate } from '../middlewares/validate';
import { asyncHandler as h } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { changePasswordBody } from '../validators/auth';
import { idParams } from '../validators/common';
import * as v from '../validators/domain';
import authRoutes from './auth.routes';

const router = Router();

router.get('/health', (_req, res) => {
  sendSuccess(res, {
    status: 'ok',
    uptime: Math.round(process.uptime()),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);

// Everything below requires a signed-in user.
router.use(authenticate);

const manager = requireRole('manager');
const admin = requireRole('admin');
const byId = validate({ params: idParams });

// ── Dashboard ──────────────────────────────────────────────────────────────
router.get('/dashboard/summary', validate({ query: v.dashboardQuery }), h(inv.summary));
router.get('/dashboard/charts', validate({ query: v.chartsQuery }), h(inv.charts));
router.get('/dashboard/recent', validate({ query: v.dashboardQuery }), h(inv.recent));

// ── Operations (staff create & process; adjustments need manager — checked in controller) ──
router.get('/operations', validate({ query: v.operationQuery }), h(op.list));
router.get('/operations/kanban', validate({ query: v.operationQuery }), h(op.kanban));
router.post('/operations', validate({ body: v.operationBody }), h(op.create));
router.get('/operations/:id', byId, h(op.get));
router.patch('/operations/:id', byId, validate({ body: v.operationPatch }), h(op.update));
router.post('/operations/:id/todo', byId, h(op.todo));
router.post('/operations/:id/check-availability', byId, h(op.checkAvailability));
router.post('/operations/:id/pick', byId, validate({ body: v.toggleBody }), h(op.pick));
router.post('/operations/:id/pack', byId, validate({ body: v.toggleBody }), h(op.pack));
router.post('/operations/:id/validate', byId, h(op.validate));
router.post('/operations/:id/cancel', byId, h(op.cancel));
router.patch('/operations/:id/status', byId, validate({ body: v.statusPatch }), h(op.setStatus));
router.get('/operations/:id/print', byId, h(op.print));

// ── Stock ──────────────────────────────────────────────────────────────────
router.get('/stock', validate({ query: v.stockQuery }), h(inv.listStock));
router.get('/stock/:productId/locations', validate({ params: v.productIdParams }), h(inv.productLocations));
router.patch('/stock/:productId', manager, validate({ params: v.productIdParams, body: v.stockAdjustBody }), h(inv.adjust));

// ── Moves (ledger — read only) ─────────────────────────────────────────────
router.get('/moves', validate({ query: v.moveQuery }), h(inv.listMoves));
router.get('/moves/kanban', validate({ query: v.moveQuery }), h(inv.movesKanban));
router.get('/moves/export.csv', validate({ query: v.moveQuery }), h(inv.exportCsv));

// ── Products, categories, contacts, reorder rules (read: all · write: manager) ──
router.get('/products', validate({ query: v.productQuery }), h(m.listProducts));
router.get('/products/:id', byId, h(m.getProduct));
router.post('/products', manager, validate({ body: v.productBody }), h(m.createProduct));
router.patch('/products/:id', manager, byId, validate({ body: v.productPatch }), h(m.updateProduct));
router.delete('/products/:id', manager, byId, h(m.deleteProduct));

router.get('/categories', h(m.listCategories));
router.post('/categories', manager, validate({ body: v.categoryBody }), h(m.createCategory));
router.patch('/categories/:id', manager, byId, validate({ body: v.categoryPatch }), h(m.updateCategory));
router.delete('/categories/:id', manager, byId, h(m.deleteCategory));

router.get('/contacts', validate({ query: v.contactQuery }), h(m.listContacts));
router.post('/contacts', manager, validate({ body: v.contactBody }), h(m.createContact));
router.patch('/contacts/:id', manager, byId, validate({ body: v.contactPatch }), h(m.updateContact));
router.delete('/contacts/:id', manager, byId, h(m.deleteContact));

router.get('/reorder-rules', validate({ query: v.reorderRuleQuery }), h(m.listReorderRules));
router.post('/reorder-rules', manager, validate({ body: v.reorderRuleBody }), h(m.createReorderRule));
router.patch('/reorder-rules/:id', manager, byId, validate({ body: v.reorderRulePatch }), h(m.updateReorderRule));
router.delete('/reorder-rules/:id', manager, byId, h(m.deleteReorderRule));

// ── Warehouses & locations (read: all · write: admin) ──────────────────────
router.get('/warehouses', h(m.listWarehouses));
router.get('/warehouses/:id', byId, h(m.getWarehouse));
router.post('/warehouses', admin, validate({ body: v.warehouseBody }), h(m.createWarehouse));
router.patch('/warehouses/:id', admin, byId, validate({ body: v.warehousePatch }), h(m.updateWarehouse));
router.delete('/warehouses/:id', admin, byId, h(m.deleteWarehouse));

router.get('/locations', validate({ query: v.locationQuery }), h(m.listLocations));
router.post('/locations', admin, validate({ body: v.locationBody }), h(m.createLocation));
router.patch('/locations/:id', admin, byId, validate({ body: v.locationPatch }), h(m.updateLocation));
router.delete('/locations/:id', admin, byId, h(m.deleteLocation));

// ── Me, notifications ──────────────────────────────────────────────────────
router.patch('/users/me', validate({ body: v.profilePatch }), h(u.updateMe));
router.post('/users/me/password', validate({ body: changePasswordBody }), h(u.changePassword));
router.post('/users/me/avatar', avatarUpload, h(u.uploadAvatar));
router.get('/users/me/activity', h(u.activity));

router.get('/notifications', validate({ query: v.notificationQuery }), h(u.listNotifications));
router.post('/notifications/read-all', h(u.readAllNotifications));
router.post('/notifications/:id/read', byId, h(u.readNotification));

// ── Users (admin) ──────────────────────────────────────────────────────────
router.get('/users', admin, validate({ query: v.userQuery }), h(u.list));
router.post('/users', admin, validate({ body: v.userCreateBody }), h(u.create));
router.patch('/users/:id', admin, byId, validate({ body: v.userPatch }), h(u.update));
router.delete('/users/:id', admin, byId, h(u.remove));

export default router;
