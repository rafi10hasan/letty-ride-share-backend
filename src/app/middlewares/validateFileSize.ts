import { NextFunction, Request, Response } from 'express';
import { MAX_FILE_SIZES } from '../../helpers/fileuploader';

export const validateFileSizes = (req: Request, res: Response, next: NextFunction): void => {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;

  if (!files) {
    next();
    return;
  }

  for (const field in files) {
    const maxSize = MAX_FILE_SIZES[field];
    for (const file of files[field]) {
      if (file.size > maxSize) {
        res.status(400).json({
          status: 'failed',
          success: false,
          message: `you can't upload --${file.originalname}-- file larger than ${Number(maxSize / (1024 * 1024)).toFixed(1)} Mb`,
        });
        return;
      }
    }
  }

  next();
};
