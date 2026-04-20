import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
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

// app.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);
// global middlewares

app.use(express.static(path.resolve('./src/public')));

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


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

app.use(cookieParser());
app.use(compression(compressionOptions));
app.use(helmetConfig);
app.use('/v1/uploads', express.static(path.join('uploads')));
app.use(applyRateLimit());

// application middleware
app.use('/api', routers);

// send html design with a button 'click to see server health' and integrate an api to check server health
app.get('/root', rootDesign);

app.get('/', (_req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({
    message: 'Server is running.',
    status: 'OK',
    success: true
  });
});

app.get('/health_check', (_req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({
    message: 'Welcome to the server. Server health is good.',
  });
});

//
app.get('/plan', (_req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Example error logging
app.get('/error', (req, _res, next) => {
  next(new BadRequestError('Testing error'));
});

app.get('/favicon.ico', (_req: Request, res: Response) => {
  res.status(204).end(); // No Content
});

// Error handling middlewares
app.use(globalErrorHandler);
app.use(notFound);

export default app;
