import express from 'express';
import DemandRoute from './demand.js';
import UserRoute from './user.js';
import FileRoute from './file.js';
import AuthRoute from './auth.js';
import ChatRoomRoute from './chat.js';
import NotificationRoute from './notification.js';

const apiRouter = express.Router();
new DemandRoute(apiRouter);
new UserRoute(apiRouter);
new FileRoute(apiRouter);
new AuthRoute(apiRouter);
new ChatRoomRoute(apiRouter);
new NotificationRoute(apiRouter);

export default apiRouter;
