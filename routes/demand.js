import DemandController from '../controllers/demandController.js';
import { authorizedCheck } from '../middleware/checkAuth.js';
class DemandRoute {
	constructor(router) {
		this.router = router;
		this.registerRoutes();
	}

	registerRoutes() {
		this.router.get(
			'/v1/demand',
			authorizedCheck,
			this.getDemands.bind(this)
		);
		this.router.post(
			'/v1/demand/create',
  			authorizedCheck,
			this.createDemand.bind(this)
		);
		this.router.get(
			'/v1/demand/:id',
			authorizedCheck,
			this.getSingleDemand.bind(this)
		);
		this.router.put(
			'/v1/demand/:id',
			authorizedCheck,
			this.updateDemand.bind(this)
		);
		this.router.delete(
			'/v1/demand/:id',
			authorizedCheck,
			this.deleteDemand.bind(this)
		);
		this.router.post(
			'/v1/demand/:id/terminate',
			authorizedCheck,
			this.terminateDemand.bind(this)
		);
		this.router.post(
			'/v1/demand/:id/cancel',
			authorizedCheck,
			this.cancelDemand.bind(this)
		);
		this.router.post(
			'/v1/demand/:id/participant/request',
			authorizedCheck,
			this.requestParticipation.bind(this)
		);
		this.router.post(
			'/v1/demand/:id/participant/interest',
			authorizedCheck,
			this.interestParticipation.bind(this)
		);
		this.router.delete(
			'/v1/demand/:id/participant/:contactId/cancel',
			authorizedCheck,
			this.cancelParticipation.bind(this)
		);
		this.router.put(
			'/v1/demand/:id/participant/:contactId/accept',
			authorizedCheck,
			this.acceptParticipant.bind(this)
		);
		this.router.put(
			'/v1/demand/:id/participant/:contactId/refuse',
			authorizedCheck,
			this.refuseParticipant.bind(this)
		);
		this.router.post(
			'/v1/demand/:id/invitee/:userId',
			authorizedCheck,
			this.inviteContact.bind(this)
		);
		this.router.put(
			'/v1/demand/:id/invitee/:userId/accept',
			authorizedCheck,
			this.acceptInvitation.bind(this)
		);
		this.router.put(
			'/v1/demand/:id/invitee/:userId/refuse',
			authorizedCheck,
			this.refuseInvitation.bind(this)
		);
		this.router.post(
			'/v1/demand/:id/feedback',
			authorizedCheck,
			this.giveFeedback.bind(this)
		);
		this.router.get(
			'/v1/demand/update/all',
			authorizedCheck,
			this.updateAllDemands.bind(this)
		);
	}

	getDemands(req, res, next) {
		DemandController.getDemands(req.query)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}

	getSingleDemand(req, res, next) {
		DemandController.getSingleDemand(req.params.id)
			.then((data) => {
				if (data) {
					res.send(data);
				} else {
					res.status(404).end();
				}
			})
			.catch(next);
	}

	createDemand(req, res, next) {
		DemandController.createDemand(req.body)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}

	updateDemand(req, res, next) {
		DemandController.updateDemand(req.params.id, req.body)
			.then((data) => {
				if (data) {
					res.send(data);
				} else {
					res.status(404).end();
				}
			})
			.catch(next);
	}

	deleteDemand(req, res, next) {
		DemandController.deleteDemand(req.params.id)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	terminateDemand(req, res, next) {
		DemandController.terminateDemand(req.params.id)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	cancelDemand(req, res, next) {
		DemandController.terminateDemand(req.params.id)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	requestParticipation(req, res, next) {
		DemandController.requestParticipation(req.params.id, req.body)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	interestParticipation(req, res, next) {
		DemandController.interestParticipation(req.params.id, req.body)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	cancelParticipation(req, res, next) {
		DemandController.cancelParticipation(req.params.id, req.params.contactId)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	acceptParticipant(req, res, next) {
		DemandController.acceptParticipant(req.params.id, {contactId:req.params.contactId})
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	refuseParticipant(req, res, next) {
		DemandController.refuseParticipant(req.params.id, {contactId:req.params.contactId})
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	inviteContact(req, res, next) {
		DemandController.inviteContact(req.params.id, req.params.userId, req.body)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	acceptInvitation(req, res, next) {
		DemandController.acceptInvitation(req.params.id, req.params.userId)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	refuseInvitation(req, res, next) {
		DemandController.refuseInvitation(req.params.id, req.params.userId)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	giveFeedback(req, res, next) {
		DemandController.giveFeedback(req.params.id, req.body)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	updateAllDemands(req, res, next) {
		console.log('update====')
		DemandController.updateAllDemands()
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
}

export default DemandRoute;
