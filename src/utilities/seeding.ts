import { ADMIN_ROLE } from '../app/modules/admin/admin.constant';
import Admin from '../app/modules/admin/admin.model';
import config from '../config';
import { randomUserImage } from './randomUserImage';

const adminData = {
  fullName: 'ADMIN',
  role: ADMIN_ROLE.SUPER_ADMIN,
  email: config.gmail_app_user,
  password: config.admin_password,
  avatar: randomUserImage(),
  isEmailVerified: true,
};

const seedingAdmin = async () => {
  try {
    const admin = await Admin.findOne({
      role: ADMIN_ROLE.SUPER_ADMIN,
      email: config.gmail_app_user,
    });
    if (!admin) {
      await Admin.create(adminData);

      console.log('admin seeded successfully!');
    } else {
      console.log('admin already exists!');
    }
  } catch (error) {
    console.log('Error seeding super admin', error);
  }
};

export default seedingAdmin;
