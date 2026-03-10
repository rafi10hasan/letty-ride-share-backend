import admin from 'firebase-admin';
import dotenv from 'dotenv';
import config from './index';
import { NotFoundError } from '../app/errors/request/apiError';


dotenv.config();

if (
  !config.firebase_clientEmail ||
  !config.firebase_privateKey ||
  !config.firebase_projectId
) {
  throw new NotFoundError(
    'Missing Firebase configuration in environment variables'
  );
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: config.firebase_projectId,
    privateKey: config.firebase_privateKey.replace(/\\n/g, '\n'),
    clientEmail: config.firebase_clientEmail,
  } as admin.ServiceAccount),
});

const firebaseAdmin = admin;

export default firebaseAdmin;
