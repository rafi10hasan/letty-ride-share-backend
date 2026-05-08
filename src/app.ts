import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import path from 'path';
import config from './config';
import { errorHandler, successHandler } from './config/morgan';

import compression from 'compression';
import { BadRequestError } from './app/errors/request/apiError';
import { globalErrorHandler } from './app/middlewares/globalHandle.error';
import notFound from './app/middlewares/notFound.route';
import { applyRateLimit } from './app/middlewares/rateLimit.config';
import routers from './app/routers';
import { compressionOptions } from './config/compression.config';
import { helmetConfig } from './config/helmet.config';
import rootDesign from './helpers/rootDesign';

const app: Application = express();
const IS_MAINTENANCE = false;



// Serve index.html at root
app.get('/', (_req: Request, res: Response): void => {
  if (IS_MAINTENANCE) {
    res
      .status(503)
      .send('🚧 Server is under maintenance. Please come back later.');
    return;
  }

  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.static(path.resolve('./src/public')));

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5174',
      'http://10.0.60.137:4173',
      'http://10.10.20.28:5174',
      'https://letimonie-rider-dashboad.vercel.app',
    ],
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

if (config.node_env !== 'test') {
  app.use(successHandler);
  app.use(errorHandler);
}

app.use(compression(compressionOptions));
app.use(helmetConfig);
app.use(applyRateLimit());

// application middleware
app.use('/api', routers);

// send html design with a button 'click to see server health' and integrate an api to check server health
app.get('/root', rootDesign);


app.get('/health_check', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'health.html'));
});


// Example error logging
app.get('/error', (_req: Request, _res: Response, next: Function) => {
  next(new BadRequestError('Testing error'));
});

app.get('/favicon.ico', (_req: Request, res: Response) => {
  res.status(204).end(); // No Content
});

// Error handling middlewares
app.use(globalErrorHandler);
app.use(notFound);

export default app;
