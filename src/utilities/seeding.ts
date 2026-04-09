
import { USER_ROLE } from '../app/modules/user/user.constant';
import User from '../app/modules/user/user.model';
import config from '../config';
import { randomUserImage } from './randomUserImage';

const adminData = {
  fullName: 'ADMIN',
  currentRole: USER_ROLE.SUPER_ADMIN,
  email: config.admin_email,
  password: config.admin_password,
  avatar: randomUserImage(),
  isEmailVerified: true,
};

const seedingAdmin = async () => {
  try {
    const admin = await User.findOne({
      email: config.admin_email,
    });
    if (!admin) {
      await User.create(adminData);

      console.log('Admin seeded successfully!');
    } else {
      console.log('Admin already exists!');
    }
  } catch (error) {
    console.log('Error seeding super admin', error);
  }
};

export default seedingAdmin;
