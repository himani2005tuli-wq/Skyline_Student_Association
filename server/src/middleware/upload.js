import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { BadRequestError } from '../utils/AppError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure base uploads directory and merchandise subdirectory exist
const uploadsBaseDir = path.resolve(__dirname, '../../uploads');
const merchandiseDir = path.resolve(uploadsBaseDir, 'merchandise');

if (!fs.existsSync(merchandiseDir)) {
  fs.mkdirSync(merchandiseDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(merchandiseDir)) {
      fs.mkdirSync(merchandiseDir, { recursive: true });
    }
    cb(null, merchandiseDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .slice(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `merch-${sanitizedBase || 'item'}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ];
  if (allowedMimes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        'Invalid file type. Only image files (JPEG, PNG, WEBP, GIF, SVG) are allowed.',
      ),
      false,
    );
  }
};

export const uploadMerchandiseImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
    files: 1,
  },
});
