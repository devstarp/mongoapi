import UserController from '../controllers/userController.js';
import * as userValidator from '../middleware/schemaValidators/userValidator.js';
import * as checkAuth from '../middleware/checkAuth.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs';
import * as emailHandler from '../handlers/emailHandler.js';
class AuthRoute {
	constructor(router) {
		this.router = router;
		this.registerRoutes();
	}

	registerRoutes() {
		this.router.post(
			'/v1/auth/signup',
  			userValidator.signupUser,
			checkAuth.signupCheck,
			this.signupUser.bind(this)
		);
		this.router.post(
			'/v1/auth/email/check',
			checkAuth.emailDuplicateCheck,
		);
		this.router.post(
			'/v1/auth/socialAuth', 
		  	userValidator.socialAuthUser, 
			checkAuth.socialAuthCheck,
			this.socialAuthUser.bind(this)
		);
		this.router.post(
			'/v1/auth/login',
		  	userValidator.loginUser,
			checkAuth.loginCheck,
			this.loginUser.bind(this)
		);
		this.router.post(
			'/v1/auth/logout',
			this.logoutUser.bind(this)
		);
		this.router.get(
			"/v1/auth/email/activate/:token", 
			this.activateUser.bind(this)
		);
		this.router.get(
			"/v1/auth/password/forgot/:email", 
			this.forgotPassword.bind(this)
		);
		this.router.get(
			"/v1/auth/password/reset/:token", 
			this.resetPassword.bind(this)
		);
		this.router.post(
			"/v1/auth/password/change", 
			checkAuth.changePasswordCheck,
			this.changePassword.bind(this)
		);
		this.router.get(
			"/v1/auth/formatDB/:dbName", 
			this.formatDB.bind(this)
		);
		this.router.get(
			"/v1/test", 
			this.testApi.bind(this)
		);
	}
	signupUser(req, res, next) {
		UserController.createUser(req.body)
			.then((user) => {
				if (process.env.ENABLE_SEND_EMAIL === "true") {
					emailHandler.sendVerificationEmail({
					  email: user.email,
					  _id: user._id,
					  username: user.firstName+' '+user.lastName
					});
					res.send({ message: "Go to your email and activate your account" })
				} else {
					res.send({ message: "Account created" })
				};
			})
			.catch(next);
	}
	loginUser(req, res, next) {
		UserController.loginUser(req.body)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
	}
	logoutUser(req, res, next) {
				res.send('data');
			// 	UserController.updateUser(req.body)
			// .then((data) => {
			// 	res.send(data);
			// })
			// .catch(next);
	}
	socialAuthUser(req, res, next) {
		const {email, firstName, lastName, social, socialID, avatar}=req.body;
		if(req.signedUser._id){
			const data = { social, socialID}
			if(email){
				data.email = email;
			}
			if (!req.signedUser.activated){
				data['profiles.0']={}
				if(firstName){
					data.firstName = firstName;
					data['profiles.0'].firstName=firstName;
				}
				if(lastName){
					data.lastName = lastName;
					data['profiles.0'].lastName=lastName;
				}
				if(avatar){
					data['profiles.0'].avatar=avatar;
				}
				data.activated=true
			}
			UserController.updateUser(req.signedUser._id, data)
		}
		if (req.signedup){
			UserController.loginUser(req.signedUser)
			.then((data) => {
				res.send(data);
			})
			.catch(next);
		}else{
			UserController.createUser({...req.body, activated:true})
			.then((user) => {
				UserController.loginUser(user)
					.then((data) => {
						res.send(data);
					})
					.catch(next);
			})
			.catch(next);
		}
	}
	async resetPassword (req, res, next) {
		try {
			const decoded = jwt.verify(req.params.token, process.env.JWT_KEY);
			const password=Math.round(Math.random(3)*1000000);
			const hash = await bcrypt.hash(password.toString(), 10)
			UserController.updateUser(decoded._id, {password:hash})
			.then(() => {
				return res.status(200).header("Content-Type", "text/html")
				.send(`<!DOCTYPE html>
				<html lang="en">
			
				<head>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
					<meta name="theme-color" content="#000000">
					<style>
						.alert {
							padding: 20px;
							background-color: #4CAF50;
							color: white;
						}
					</style>
					<title>Labul</title>
				</head>
				<body>
					<div class="alert">
						<strong>Success!</strong>
						 Votre mot de passe est remplacé par ${password} (au moins 6 au hasard). Vous pouvez vous connecter à l'application avec le mot de passe et si vous le souhaitez, vous pouvez réinitialiser le mot de passe dans Mes informations.
					</div>
				
				</body>
				
				</html>
				`);
			})
			.catch((err) => {
				return res.status(401).header("Content-Type", "text/html")
				.send(`<!DOCTYPE html>
				<html lang="en">
				
				<head>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
					<meta name="theme-color" content="#000000">
					<style>
						.alert {
							padding: 20px;
							background-color: #f44336;
							color: white;
						}
					</style>
					<title>Labul</title>
				</head>
				
				<body>
					<div class="alert">
						<strong>Erreur !</strong> Une erreur s'est produite.
					</div>
				
				</body>
				
				</html>
				`);
			});
		} 
		catch (err) {
			return res.status(401).header("Content-Type", "text/html")
			.send(`<!DOCTYPE html>
			<html lang="en">
			
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
				<meta name="theme-color" content="#000000">
				<style>
					.alert {
						padding: 20px;
						background-color: #f44336;
						color: white;
					}
				</style>
				<title>Labul</title>
			</head>
			
			<body>
				<div class="alert">
					<strong>Le temps a expiré. </strong> Veuillez réessayer.
				</div>
			
			</body>
			
			</html>
			`);
		}
	}
	activateUser (req, res, next) {
		if (process.env.ENABLE_SEND_EMAIL === "false") {
			return res.status(200).header("Content-Type", "text/html")
			.send(`<!DOCTYPE html>
			<html lang="en">
			
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
				<meta name="theme-color" content="#000000">
				<style>
					.alert {
						padding: 20px;
						background-color: #f44336;
						color: white;
					}
				</style>
				<title>Labul</title>
			</head>
			
			<body>
				<div class="alert">
					<strong>Error!</strong> Disabled.
				</div>
			
			</body>
			
			</html>
		`);
		}
		try {
			const decoded = jwt.verify(req.params.token, process.env.JWT_KEY);
			UserController.updateUser(decoded._id, {activated:true})
			.then(() => {
				return res.status(200).header("Content-Type", "text/html")
				.send(`<!DOCTYPE html>
				<html lang="en">
			
				<head>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
					<meta name="theme-color" content="#000000">
					<style>
						.alert {
							padding: 20px;
							background-color: #4CAF50;
							color: white;
						}
					</style>
					<title>Labul</title>
				</head>
				<body>
					<div class="alert">
						<strong>Succès!</strong> Compte activé.
					</div>
				
				</body>
				
				</html>
				`);
			})
			.catch((err) => {
				return res.status(401).header("Content-Type", "text/html")
				.send(`<!DOCTYPE html>
				<html lang="en">
				
				<head>
					<meta charset="utf-8">
					<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
					<meta name="theme-color" content="#000000">
					<style>
						.alert {
							padding: 20px;
							background-color: #f44336;
							color: white;
						}
					</style>
					<title>Labul</title>
				</head>
				
				<body>
					<div class="alert">
						<strong>Erreur!</strong> Quelque chose s'est mal passé.
					</div>
				
				</body>
				
				</html>
				`);
			});
		} 
		catch (err) {
			return res.status(401).header("Content-Type", "text/html")
			.send(`<!DOCTYPE html>
			<html lang="en">
			
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
				<meta name="theme-color" content="#000000">
				<style>
					.alert {
						padding: 20px;
						background-color: #f44336;
						color: white;
					}
				</style>
				<title>Labul</title>
			</head>
			
			<body>
				<div class="alert">
					<strong>Le temps a expiré. </strong> Veuillez réessayer.
				</div>
			
			</body>
			
			</html>
			`);
		}
	}
	changePassword(req, res, next) {
		UserController.updateUser(req.body.userId, req.body)
		.then((data) => {
			res.send(data);
		})
		.catch(next);
	}
	forgotPassword(req, res, next) {
		UserController.getUsers({email:req.params.email})
		.then((users) => {
			if(users.length>0){
				emailHandler.sendPasswordResetEmail({
					email: resUser.email,
				   _id: resUser._id,
				   username: resUser.firstName+' '+resUser.lastName
				 });
			res.send({message: 'Email Sent'});
			}
			res.send({message: `Email doesn't exist`});
		})
		.catch(next);
	}
	async formatDB  (req, res, next){
		mongoose.connection.db.dropCollection(req.params.dbName).then(result=>{
			res.status(200).send('successed to format the db')
		}).catch(err=>{
			res.status(400).send(err)
		})
	}
	testApi(req, res, next){
		res.send({message:'Current API updated date is 2022/01/18 04:46'})
	}
}

export default AuthRoute;
