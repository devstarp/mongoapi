import UserController from '../controllers/userController.js';
import * as userValidator from '../middleware/schemaValidators/userValidator.js';
import { authorizedCheck } from '../middleware/checkAuth.js';

class UserRoute {
	constructor(router) {
		this.router = router;
		this.registerRoutes();
	}

	registerRoutes() {
		this.router.get(
			'/v1/user',
			// authorizedCheck,
			this.getUsers.bind(this)
		);
		this.router.get(
			'/v1/user/search',
			authorizedCheck,
			this.getSearchUsers.bind(this)
		);
		this.router.post(
			'/v1/user',
			authorizedCheck,
			this.addUser.bind(this)
		);
		this.router.get(
			'/v1/user/:id',
			authorizedCheck,
			this.getSingleUser.bind(this)
		);
		this.router.put(
			'/v1/user/:id',
			this.updateUser.bind(this)
		);
		this.router.delete(
			'/v1/user/:id',
			authorizedCheck,
			this.deleteUser.bind(this)
		);
		this.router.get(
			'/v1/user/:userId/profiles',
			authorizedCheck,
			this.getUsers.bind(this)
		);
		this.router.get(
			'/v1/user/:userId/profiles/:profileId',
			authorizedCheck,
			this.getUsers.bind(this)
		);
		this.router.post(
			'/v1/user/:userId/profiles',
			authorizedCheck,
			this.addProfile.bind(this)
		);
		this.router.put(
			'/v1/user/:userId/profiles/:profileId',
			authorizedCheck,
			this.updateProfile.bind(this)
		);
		this.router.post(
			'/v1/user/:userId/profiles/:profileId/subscribe',
			authorizedCheck,
			this.subscribeProAccount.bind(this)
		);
		this.router.delete(
			'/v1/user/:userId/profiles/:profileId',
			authorizedCheck,
			this.removeAccount.bind(this)
		);
		this.router.post(
			'/v1/user/:userId/circles',
			authorizedCheck,
			this.addToCircle.bind(this)
		);
		this.router.delete(
			'/v1/user/:userId/circles',
			authorizedCheck,
			this.removeFromCircle.bind(this)
		);
		this.router.post(
			'/v1/user/:userId/groups',
			authorizedCheck,
			this.createGroup.bind(this)
		);
		this.router.put(
			'/v1/user/:userId/groups/:groupId',
			authorizedCheck,
			this.updateGroup.bind(this)
		);
		this.router.delete(
			'/v1/user/:userId/groups/:groupId',
			authorizedCheck,
			this.removeGroup.bind(this)
		);
		this.router.post(
			'/v1/user/:userId/feedbacks',
			authorizedCheck,
			this.giveFeedbacks.bind(this)
		);
	}
	getUsers(req, res, next) {
		UserController.getUsers(req.query, false)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	getSearchUsers(req, res, next) {
		UserController.getUsers(req.query, true)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	getSingleUser(req, res, next) {
		UserController.getSingleUser(req.params.id, req.query)
			.then((data) => {
				if (data) {
					res.send(data);
				} else {
					res.status(404).end();
				}
			})
			.catch(next);
	}
	addUser(req, res, next) {
		UserController.addUser(req.body)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	updateUser(req, res, next) {
		UserController.updateUser(req.params.id,req.params.profileId, req.body)
			.then((data) => {
				if (data) {
					res.send(data);
				} else {
					res.status(404).end();
				}
			})
			.catch(next);
	}
	addProfile(req, res, next) {
		UserController.addProfile(req.params.userId,req.body)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	updateProfile(req, res, next) {
		UserController.updateProfile(req.params.userId,req.params.profileId, req.body)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	subscribeProAccount(req, res, next) {
		console.log('subscribe====',req.params)
		UserController.subscribeProAccount(req.params.userId, req.params.profileId, req.body)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	removeAccount(req, res, next) {
		UserController.removeAccount(req.params.userId, req.params.profileId)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	su
	addToCircle(req, res, next) {
		UserController.addToCircle(req.params.userId, req.body)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	removeFromCircle(req, res, next) {
		UserController.removeFromCircle(req.params.userId, req.body)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	createGroup(req, res, next) {
		UserController.createGroup(req.params.userId, req.body)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	updateGroup(req, res, next) {
		UserController.updateGroup(req.params.userId, req.params.groupId, req.body)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	removeGroup(req, res, next) {
		UserController.removeGroup(req.params.userId, req.params.groupId)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	giveFeedbacks(req, res, next) {
		UserController.giveFeedbacks(req.params.userId, req.body)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	deleteUser(req, res, next) {
		UserController.deleteUser(req.params.id)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
}

export default UserRoute;
