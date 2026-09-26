import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { UPLOADS_DIR } from '../config/paths';
import { ApiError } from '../utils/ApiError';

const AVATAR_DIR = path.join(UPLOADS_DIR, 'avatars');
const ALLOWED = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

export const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(AVATAR_DIR, { recursive: true });
      cb(null, AVATAR_DIR);
    },
    filename: (req, file, cb) => cb(null, `${req.user?.id ?? 'anon'}-${Date.now()}${ALLOWED.get(file.mimetype) ?? '.img'}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(ApiError.unprocessable('Upload a PNG, JPG, WebP or GIF image', [{ field: 'avatar', message: 'Unsupported file type' }]));
  },
}).single('avatar');
