import express from 'express';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import responseTime from 'response-time';
import winston from 'winston';
import logger from './lib/logger';
import settings from './lib/settings';
import security from './lib/security';
import { db } from './lib/mongo';
import dashboardWebSocket from './lib/dashboardWebSocket';
import ajaxRouter from './ajaxRouter';
import apiRouter from './apiRouter';
import cors from 'cors';

const dotenv = require('dotenv');
dotenv.config();

const app = express();

security.applyMiddleware(app);
app.set('trust proxy', 1);
app.use(helmet());

app.use(cors( {origin: [ "http://localhost:4000", "http://127.0.0.1:4000",'http://www.a2nyla.com',`http://${process.env.BK_HOST}:4000`,],
                  credentials: true,
                 }));
app.all('*', (req, res, next) => {
	// CORS headers
	res.header('Access-Control-Allow-Origin', security.getAccessControlAllowOrigin());
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	res.header('Access-Control-Allow-Credentials', 'true');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Key, Authorization');
	next();
});
app.use(responseTime());
app.use(cookieParser(settings.cookieSecretKey));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/ajax', ajaxRouter);
app.use('/api', apiRouter);
app.use(logger.sendResponse);

const backendServerHost = process.env.BK_HOST || 'localhost';
console.log('===== src/api/server/index.js: backendServerHost: ', backendServerHost);
const server = app.listen(settings.apiListenPort, () => {
	const serverAddress = server.address();
	winston.info(`API running at http://${backendServerHost}:${serverAddress.port}`);
});

dashboardWebSocket.listen(server);
