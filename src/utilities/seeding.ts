
import { USER_ROLE } from '../app/modules/user/user.constant';
import User from '../app/modules/user/user.model';
import config from '../config';
import { randomUserImage } from './randomUserImage';

const adminData = {
  fullName: 'ADMIN',
  currentRole: USER_ROLE.SUPER_ADMIN,
  email: "rafayet12837@gmail.com", //config.gmail_app_user,
  password: config.admin_password,
  avatar: randomUserImage(),
  isEmailVerified: true,
};

const seedingAdmin = async () => {
  try {
    const admin = await User.findOne({
      email: config.gmail_app_user,
    });
    if (!admin) {
      await User.create(adminData);

      console.log('admin seeded successfully!');
    } else {
      console.log('admin already exists!');
    }
  } catch (error) {
    console.log('Error seeding super admin', error);
  }
};

export default seedingAdmin;
