import { Types } from 'mongoose';
import { z } from 'zod';

export const objectId = z
  .string()
  .trim()
  .refine((v) => Types.ObjectId.isValid(v), 'Invalid id');

/** Optional id in query strings — empty string means "not set". */
export const optionalObjectId = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || Types.ObjectId.isValid(v), 'Invalid id');

export const idParams = z.object({ id: objectId });

export const pageQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  search: z.string().trim().max(100).optional().default(''),
};

export const booleanQuery = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0', ''])])
  .optional()
  .transform((v) => (v === undefined || v === '' ? undefined : v === true || v === 'true' || v === '1'));

/** Escapes user input before building a case-insensitive regex. */
export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
