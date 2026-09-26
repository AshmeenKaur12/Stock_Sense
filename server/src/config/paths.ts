import path from 'node:path';

/** Uploaded files (avatars) live in server/uploads and are served at /uploads. */
export const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');
