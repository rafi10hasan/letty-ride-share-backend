import { Server as HTTPServer } from 'http';
import mongoose from 'mongoose';
import app from './app';
import config from './config';

import { initializeRideCrons } from './cron/rideCron';
import { subscriptionCron } from './cron/subscriptionCron';
import { connectSocket } from './socket/connectSocket';
import seedingAdmin from './utilities/seeding';

let server: HTTPServer;

// handle uncaught exception error
process.on('uncaughtException', (error) => {
  console.log('uncaughtException error', error);
  process.exit(1);
});

const runServer = async () => {
  await mongoose.connect(config.mongodb_url as string, {
    maxPoolSize: 5,
    minPoolSize: 2
  });
  console.log('\x1b[32mDatabase has been connected successfully\x1b[0m');

  initializeRideCrons();
  subscriptionCron();
  
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : config.base_url || 'localhost';

  server = app.listen(config.server_port || 5002, host, () => {
    console.log(`\x1b[33mServer is listening on port http://${host}:${config.server_port || 5020}\x1b[0m`);
  });

  seedingAdmin();
  // initialize socket after server is created
  connectSocket(server);
};

// handle unhandled rejection
process.on('unhandledRejection', (reason, promise) => {
  console.log(`unhandle rejection at ${promise} and reason ${reason}`);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// gracefull shoutdown on SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received.');
  server.close(() => {
    console.log('Server closed.');
  });
});

runServer();
