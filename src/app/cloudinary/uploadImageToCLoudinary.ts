import cloudinary from "../../config/cloudinary.config";
import streamifier from 'streamifier';

export const uploadToCloudinary = (
  file: Express.Multer.File,
  folderName: 'profile_images' | 'car_images' | 'kyc_images' | 'chat_images',
): Promise<{ secure_url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto',
        transformation: [{ quality: 'auto' }],
        max_file_size: 5 * 1024 * 1024, 
      },
      (error, result) => {
        if (error || !result) {
          return reject(new Error(`Cloudinary upload failed for file ${file.originalname}: ${error?.message}`));
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      },
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};
