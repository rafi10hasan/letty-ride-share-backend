
import { USER_ROLE } from '../app/modules/user/user.constant';
import User from '../app/modules/user/user.model';
import config from '../config';
import logger from '../config/logger';
import { randomUserImage } from './randomUserImage';

const adminData = {
  fullName: 'ADMIN',
  currentRole: USER_ROLE.SUPER_ADMIN,
  email: config.admin_email,
  password: config.admin_password,
  avatar: randomUserImage(),
  isEmailVerified: new Date(),
};

const seedingAdmin = async () => {
  try {
    const admin = await User.findOne({
      email: config.admin_email,
    });
    if (!admin) {

      const user = await User.create(adminData);
      user.verification.emailVerifiedAt = new Date();
      await user.save();

      logger.info('Admin seeded successfully!');
    } else {
      logger.info('Admin already exists!');
    }
  } catch (error) {
    logger.error('Error seeding super admin', error); 
  }
};

export default seedingAdmin;
