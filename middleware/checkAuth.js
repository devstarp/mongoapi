import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const User = mongoose.model("User");
export const loginCheck = (req, res, next) => {
    User.findOne({email:new RegExp("^" + req.body.email, "i")})
    .then((user) => {
      if (!user) {
        return res.status(400).json({ message: "Il n'y a pas d'enregistrement d'utilisateur correspondant à cet identifiant. L'utilisateur a peut-être été supprimé." });
      } else {
        bcrypt.compare(req.body.password, user.password, (err, result) => {
          if (err) {
            return res.status(400).json({ message: "Mot de passe incorrect" });
          }
          if (result) {
            if (!user.activated) {
              return res.status(400).json({ message: "Le compte n'est pas activé" });
            }
            return next();
          }
            return res.status(400).json({ message: "Mot de passe incorrect" });
        });
      }
    })
    .catch((err) => {
      return res.status(500).json({ message: "Non enregistré" });
    });
};
export const signupCheck = async (req, res, next) => {
  const userCount = await User.countDocuments({email:new RegExp("^" + req.body.email, "i")})
  if(userCount>0){
    return res.status(400).json({ message: "Il existe déjà un compte avec ce mail"});
  }
  bcrypt.hash(req.body.password, 10, (err, hash)=>{
    if(err){
     return res.status(400).json({ message: "Échec de l'inscription"});
    }else{
      req.body.password= hash;
      next();
    }
  })
};
export const emailDuplicateCheck = async (req, res, next) => {
  const userCount = await User.countDocuments({email:new RegExp("^" + req.body.email, "i")})
  if(userCount>0){
    return res.status(400).json({ message: "Il existe déjà un compte avec ce mail"});
  }
  return res.status(200).json({ message: "No Duplicates."});
};
export const socialAuthCheck = async (req, res, next) => {
  User.find({$or:[
    {
      social:req.body.social,
      socialID:req.body.socialID,
    },
    {
      email:new RegExp("^" + req.body.email, "i")
    }
  ]}).then((users)=>{
    console.log(users.map(user=>user.email))
    if(users.length>1){
      const socialUser = users.find(user=>user.social===req.body.social&&user.socialID===req.body.socialID)
      const emailUser = users.find(user=>user.email===req.body.email)
      return res.status(500).json({ message: 
        `${emailUser.email} a déjà été inscrit. Votre compte social actuel a déjà été enregistré avec ${socialUser.email}.Veuillez contacter l'administrateur.` 
      });
    }
    if(users.length===1){
      req.signedup=true;
      req.signedUser=users[0];
    }else{
      req.signedup=false;
      req.signedUser={};
    }
    next();
  }).catch(err=>{
    return res.status(500).json({ message: "Échec de l'authentification sociale" });
  })
};
export const changePasswordCheck = async (req, res, next) => {
  if (req.body.newPassword !== req.body.confirmPassword){
    return res.status(400).json({ message: "Confirmer le nouveau mot de passe"})
  }
  User.findById(req.body.userId).then((user) => {
      if (!user) {
        return res.status(400).json({ message: "Ce compte n'a pas été signé"})
      }
      if(!user.password && !!user.social){
      console.log(user.password, !!user.social)
      bcrypt.hash(req.body.newPassword, 10).then((hash)=>{
          req.body.password= hash;
          req.body.newPassword= undefined;
        return next();
      }).catch(err=>{
      return res.status(400).json({ message: "Échec de la modification du mot de passe" });
      })
      }else{
        bcrypt.compare(req.body.oldPassword, user.password, (err, result) => {
          if (err) {
            return res.status(400).json({ message: "Mot de passe incorrect" });
          }
          if (result) {
            if (!user.activated) {
              return res.status(400).json({ message: "Le compte n'est pas activé" });
            }
            bcrypt.hash(req.body.newPassword, 10).then((hash)=>{
                req.body.password= hash;
                req.body.newPassword= undefined;
              return next();
            }).catch(err=>{
            return res.status(400).json({ message: "Échec de la modification du mot de passe" });
            })
          }else{
            return res.status(400).json({ message: "Mot de passe incorrect" });
          }
        });
      }
      })
    .catch((err) => {
      return res.status(500).json({ message: "Non enregistré" });
    });
};
export const authorizedCheck = (req, res, next) => {
  next()
  // try {
  //   //const token = req.token;
  //   const token = req.get("Authorization").split(" ")[1];
  //   const decoded = jwt.verify(token, process.env.JWT_KEY);
  //   req.userData = decoded;
  //   console.log('authoriezed====', decoded)
  //   next();
  //   // User.findById(req.userData.userId)
  //   // .then((user) => {
  //   //   if (!user) return res.status(404).json({ message: "User not found" });
  //   //   next();
  //   // })
  //   // .catch((err) => {
  //   //   return res.status(500).json({ message: err.message });
  //   // });
  // } catch (err) {
  //   return res.status(401).json({ message: "Votre jeton a expiré" });
  // }
};
