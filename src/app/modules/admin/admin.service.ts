import { deleteImageFromCloudinary } from "../../cloudinary/deleteImageFromCloudinary";
import { uploadToCloudinary } from "../../cloudinary/uploadImageToCLoudinary";
import { BadRequestError } from "../../errors/request/apiError";
import { IUser, TProfileImage } from "../user/user.interface";
import User from "../user/user.model";


// service for update specific admin
const updateAdmin = async (id: string, data: Partial<IUser>) => {
  return await User.updateOne({ _id: id }, data, { new: true });
};

const updateAdminProfileImage = async (user: IUser, files: TProfileImage) => {
  // 1. File check
  if (!files?.profile_image?.length) {
    throw new BadRequestError('No profile image provided');
  }

  // 4. New image upload
  let newProfileImageUrl: string;

  if (!files.profile_image[0] || !files.profile_image[0].buffer) {
    console.log("File buffer is missing");
  }
  try {
    const result = await uploadToCloudinary(
      files.profile_image[0],
      'profile_images'
    );

    if (!result?.secure_url) {
      throw new Error('Cloudinary upload failed');
    }

    newProfileImageUrl = result.secure_url;
    console.log({ newProfileImageUrl })
  } catch (error) {
    throw new BadRequestError('Image upload failed');
  }

  try {

    await User.findByIdAndUpdate(
      user._id,
      { avatar: newProfileImageUrl },
      { new: true }
    );


  } catch (error) {

    await deleteImageFromCloudinary(newProfileImageUrl);
    throw error;
  }

  const oldAvatarUrl = user?.avatar
  if (oldAvatarUrl) {
    await deleteImageFromCloudinary(oldAvatarUrl);
  }

  return { avatar: newProfileImageUrl };
};

export default {
  updateAdmin,
  updateAdminProfileImage
}