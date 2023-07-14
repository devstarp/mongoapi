import NotificationController from '../controllers/notificationController.js';
import * as userValidator from '../middleware/schemaValidators/userValidator.js';
import { authorizedCheck } from '../middleware/checkAuth.js';

class NotificationRoute {
	constructor(router) {
		this.router = router;
		this.registerRoutes();
	}

	registerRoutes() {
		this.router.get(
			'/v1/notification',
			authorizedCheck,
			this.getNotifications.bind(this)
		);
		this.router.post(
			'/v1/notification/read',
			authorizedCheck,
			this.readNotifications.bind(this)
		);
		this.router.post(
			'/v1/notification',
			authorizedCheck,
			this.createNotification.bind(this)
		);
	}
	getNotifications(req, res, next) {
		NotificationController.getNotifications(req.query)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	readNotifications(req, res, next) {
		NotificationController.readNotifications(req.query.notificationIds)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	createNotification(req, res, next) {
		NotificationController.createNotification(req.body)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
}

export default NotificationRoute;