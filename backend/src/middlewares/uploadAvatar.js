import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";

const UPLOAD_DIR = path.resolve("uploads/avatars");
const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten imágenes JPG, PNG o WebP"));
  }
};

export const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });

export async function processAvatar(file) {
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const outputPath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  await sharp(file.buffer)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toFile(outputPath);

  return filename;
}

export function removeAvatar(filename) {
  if (!filename) return;
  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
