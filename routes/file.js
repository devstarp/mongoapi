import { authorizedCheck } from '../middleware/checkAuth.js';
import uploadFiles from '../middleware/uploadFiles.js'
class FileRoute {
	constructor(router) {
		this.router = router;
		this.registerRoutes();
	}
	registerRoutes() {
		this.router.post(
			'/v1/upload/:directory',
			// authorizedCheck,
			uploadFiles,
		);
		this.router.get(
			'/v1/upload',
			// authorizedCheck,
			this.test.bind(this),
		);
	}

	test(req, res, next) {
		return res.status(200).json('api connected');
	}
}

export default FileRoute;
