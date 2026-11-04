import { randomUUID } from 'node:crypto';
import { mkdir, open, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { httpError } from '../utils/httpError.js';

// Screenshots are stored on disk under server/uploads/<workspaceId>/ (git-ignored);
// MongoDB keeps only the metadata.
export const UPLOAD_DIR = fileURLToPath(new URL('../../uploads', import.meta.url));
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

const IMAGE_TYPES = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

export function storedFilePath(workspaceId, storedName) {
  return join(UPLOAD_DIR, workspaceId.toString(), storedName);
}

const storage = multer.diskStorage({
  async destination(req, file, cb) {
    const dir = join(UPLOAD_DIR, req.workspace._id.toString());
    try {
      await mkdir(dir, { recursive: true });
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  // Random server-side names: the client's filename is never used as a path.
  filename(req, file, cb) {
    cb(null, `${randomUUID()}${IMAGE_TYPES[file.mimetype]}`);
  },
});

export const screenshotUpload = multer({
  storage,
  limits: { fileSize: MAX_SCREENSHOT_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    if (IMAGE_TYPES[file.mimetype]) return cb(null, true);
    cb(httpError(415, 'Screenshots must be PNG, JPEG or WebP images'));
  },
});

// The declared MIME type comes from the client, so confirm the file really starts
// with a PNG, JPEG or WebP signature before trusting it.
export async function hasImageSignature(path) {
  const handle = await open(path, 'r');
  try {
    const { buffer } = await handle.read(Buffer.alloc(12), 0, 12, 0);
    const png = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const webp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    return png || jpeg || webp;
  } finally {
    await handle.close();
  }
}

export async function removeFile(path) {
  await unlink(path).catch(() => {});
}
