import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create upload directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = process.env.ALLOWED_FILE_TYPES 
    ? process.env.ALLOWED_FILE_TYPES.split(',').map(type => type.trim())
    : ['image/jpeg', 'image/png', 'image/webp'];
  const mimeType = file.mimetype;
  if (allowedTypes.includes(mimeType)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${mimeType} not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

const maxFileSize = Number(process.env.MAX_FILE_SIZE);

const FILE_SIZE_LIMIT = !isNaN(maxFileSize) ? maxFileSize : 5 * 1024 * 1024;

export const upload = multer({
  storage,
  limits: {
    fileSize:  FILE_SIZE_LIMIT,
    files: 5, // Max 5 files
  },
  fileFilter,
});

console.log("Max file size:",  FILE_SIZE_LIMIT);

export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'File too large. Maximum size is 5MB.',
      LIMIT_FILE_COUNT: 'Too many files. Maximum 5 files allowed.',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field.',
    };
    return res.status(400).json({ success: false, message: messages[err.code] || 'File upload error.' });
  } else if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

