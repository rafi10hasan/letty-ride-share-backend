import { Request } from 'express';
import multer from 'multer';

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/svg+xml'];

const storage = multer.memoryStorage();

// Per-field max size (bytes)
export const MAX_FILE_SIZES: Record<string, number> = {
  profile_image: 1 * 1024 * 1024,
  car_images: 2 * 1024 * 1024,
  verification_image: 2 * 1024 * 1024,
  chat_images: 1 * 1024 * 1024,
};

export const MAX_FILE_COUNTS: Record<string, number> = {
  profile_image: 1,
  car_images: 5,
  verification_image:1,
  chat_images: 3
};

const fileFilter = (_req: Request, file: Express.Multer.File, cb: any) => {
  const allowedFieldnames = Object.keys(MAX_FILE_SIZES);
  console.log(file)
  // Field validation
  if (!allowedFieldnames.includes(file.fieldname)) {
    return cb(new Error(`Invalid fieldname: ${file.fieldname}`));
  }

  // Image-only validation (including driving_license)
  if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
    const allowedFormats = IMAGE_MIME_TYPES.map((type) => type?.split('/')[1]).join(', ');
    return cb(new Error(`${file.fieldname} must be an image file: ${allowedFormats}`));
  }

  // Per-file size validation
  const maxSize = MAX_FILE_SIZES[file.fieldname];
  if (file.size > maxSize) {
    return cb(new Error(`${file.fieldname} exceeds the size limit of ${maxSize / (1024 * 1024)}MB`));
  }

  cb(null, true);
};

export const uploadFile = () =>
  multer({
    storage,
    fileFilter,
  }).fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'car_images', maxCount: 5 },
    { name: 'verification_image', maxCount: 1 },
    { name: 'chat_images', maxCount: 3 },
  ]);
