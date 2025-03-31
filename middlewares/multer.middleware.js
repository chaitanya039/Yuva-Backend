import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from "fs";

// Ensure temp folder exists
const tempDir = path.join(process.cwd(), "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Define allowed file types
const allowedTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/x-icon', // for .ico files
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'temp/'); // temporary folder before Cloudinary upload
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max
  }
});

export default upload;
