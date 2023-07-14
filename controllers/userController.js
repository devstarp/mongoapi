import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
const User = mongoose.model("User");
const ChatRoom = mongoose.model("ChatRoom");
const Demand = mongoose.model("Demand");
const Notification = mongoose.model("Notification");
class UserController {
  constructor() {}
  getFilter(params = {}) {
    const filter = {
      activated: true,
    };
    if (params.all) {
      delete filter.activated
    }
    if (params.id) {
      filter._id = params.id;
    }
    if (params.userId&& params.userId.length>0) {
      const idsArray = params.userId.split(',');
      const objectIDs = [];
      if(idsArray.length===0){
        filter._id = {$ne:mongoose.Types.ObjectId(params.userId)};
      }else{
        for (const id of idsArray) {
          objectIDs.push(mongoose.Types.ObjectId(id));
        }
        filter._id = {$nin:objectIDs};
      }
    }
    if (params.ids && params.ids.length>0) {
      const idsArray = params.ids.split(',');
      const objectIDs = [];
      for (const id of idsArray) {
          objectIDs.push(mongoose.Types.ObjectId(id));
      }
        filter._id= {$in:objectIDs}
    }
    if (params.email) {
      filter.email = new RegExp("^" + params.email, "i");
    }
    if (params.social && params.socialID) {
      filter.social = params.social;
      filter.socialID = params.socialID;
    }
    if (params.search) {
      filter.$or = [
        // { email: new RegExp(params.search, 'i') },
        { firstName: new RegExp("^" + params.search, "i") },
        { lastName: new RegExp("^" + params.search, "i") },
      ];
    }
    if (params.accountId) {
      filter['profiles._id']={$eq:params.accountId};
    }
    return filter;
  }
  getProjection(params={}){
    const {accountId}=params;
    const projection ={
      _id:1,
      activateLocation:1,  
      feedbacks:1,
      groups:1,    
    }
    if(accountId){
      projection['profiles.$']=1;
    } else{
      projection.profiles=1;
      projection.friends=1;
      projection.families=1;
      projection.neighbors=1;
    }
    return projection
  }
  createUser = async (data) => {
    const resUser = await new User({
      ...data,
      'profiles.0.firstName':data.firstName,
      'profiles.0.lastName':data.lastName,
      'profiles.0.avatar':data.avatar,
    }).save();
    if(resUser){
      return resUser
    } else{
      return Promise.reject({ message: "Failed to signup" });
    }
    
  };
  getUsers =async (params = {}, search=false) =>{
    // if ( search && Object.keys(params).length<=1){
    //   return { users:[] }
    // }
    const filter = this.getFilter(params);
    const limit = 1000;
    const offset =  0;
    const projection = this.getProjection(params);
    
    return Promise.all([
      User.find( filter, projection ),
      User.countDocuments(filter),
    ]).then(([users, usersCount]) => {
      const result = {
        total_count: usersCount,
        has_more: offset + users.length < usersCount,
        users,
      };
      return result;
    });
  }
  getSingleUser(id, params) {
    return this.getUsers({ id, ...params }).then((items) => (items.users.length > 0 ? items.users[0] : {}));
  }
  loginUser = async (data) => {
    let loginUser = await this.getUsers(data)
    if(loginUser.users.length===0){
      return Promise.reject({ message: "This account doesn't exist" });
    }
    loginUser= loginUser.users[0]
    const token = jwt.sign(
        {
          email: loginUser.email,
          userId: loginUser._id,
        },
        process.env.JWT_KEY,
        // {
        //   expiresIn: "30m",
        // }
      );
      return {account:loginUser, token: "Bearer " + token,};
    };
  updateUser = async (id, data) => {
    const userId= mongoose.Types.ObjectId(id)
    if( data.email&& data.email.length>0){
      const findUser = await User.find({
        $and: [
          { email: data.email },
          { _id: { $ne: userId } },
        ],
      }).select("email")
      if (findUser){
        if (findUser.email === data.email) {
          return Promise.reject({ message: "Email exists" });
        }
      }
    }
    const updatedUser = await User.findByIdAndUpdate(id, data, {new:true}) 
    if(updatedUser){
      return this.getSingleUser(updatedUser._id)
    }else{
      return Promise.reject('faild to update');
    }
  };
  deleteUser = async (id)=> {
    if (!mongoose.isValidObjectId(id)) {
      return Promise.reject('Invalid identifier');
    }
    const userId = mongoose.Types.ObjectId(id);
    const res = await Promise.all([
      User.deleteOne({ _id: userId }),
      Notification.deleteMany({sender:userId}),
      Demand.deleteMany({user:userId}),
      ChatRoom.deleteMany({members:userId}),
      User.updateMany(
        {families:userId},
        {
          $pull:{families:userId}
        }
      ),
      User.updateMany(
        {neighbors:userId},
        {
          $pull:{neighbors:userId}
        }
      ),
      User.updateMany(
        {friends:userId},
        {
          $pull:{friends:userId}
        }
      ),
      User.updateMany(
        {},
        {
          $pull:{'groups.$[groupIndex].members':userId}
        },
        {arrayFilters:[{'groupIndex.members': userId}]}
      ),
      Demand.updateMany(
        {'participants.user':userId},
        {
          $pull:{participants:{user:userId}}
        }
      ),
      Demand.updateMany(
        {'invitees.user':userId},
        {
          $pull:{invitees:{user:userId}}
        }
      ),
      // User.updateMany({})
    ])
    // const deleteResponse = await User.deleteOne({ _id: userId });
    return { message: 'successed to delete' }
  }
  addProfile = async (id, data)=>{
    // if( data.email&& data.email.length>0){
    //   const findUser = await User.find({
    //     $and: [
    //       { email: data.email },
    //       { _id: { $ne: userId } },
    //     ],
    //   }).select("email")
    //   if (findUser){
    //     if (findUser.email === data.email) {
    //       return Promise.reject({ message: "Email exists" });
    //     }
    //   }
    // }
    const updatedUser = await User.findByIdAndUpdate(id, 
      {
        $push:{profiles:data}
      }, 
      {new:true}) 
    return this.getSingleUser(id)
  }
  updateProfile = async (id, accountId, data)=>{
    const firstName= data.firstName;
    const lastName= data.lastName;
    console.log('update profile ===',data)
    await User.findOneAndUpdate(
      {
        _id: mongoose.Types.ObjectId(id),
        'profiles._id': mongoose.Types.ObjectId(accountId),
      },
      { 
        $set: { 
          "profiles.$" : {name:data.name} 
        },
      },
    ) 
    return this.getSingleUser(id)
  }
  subscribeProAccount = async (id, accountId, data)=>{

    await User.findByIdAndUpdate(id,
      { $push: { "profiles.$[profile].subscribers" : data.contactId } },
      {
        multi: true,
        arrayFilters: [ { "profile._id": { $eq: mongoose.Types.ObjectId(accountId) } } ]
      }) 
    return this.getSingleUser(id,{accountId})
  }
  removeAccount = async (id, accountId)=>{
    await User.findByIdAndUpdate(id, {
      $pull:{profiles:{_id:mongoose.Types.ObjectId(accountId)}}
    }, {new:true}) 
    return this.getSingleUser(id)
  }
  createGroup = async (id, data)=>{
    const updatedUser = await User.findByIdAndUpdate(id, {
      $push:{groups:data}
    }, {new:true}) 
    return this.getSingleUser(id)
  }
  updateGroup = async (id, groupId, data)=>{
    if(data.members.length>0){
      data.members = data.members.map(member=>mongoose.Types.ObjectId(member))
    }
    const updatedUser = await User.updateOne(
      {
        _id: mongoose.Types.ObjectId(id),
        'groups._id': mongoose.Types.ObjectId(groupId)
      }, 
      { $set: { 
        "groups.$.members" : data.members,
        "groups.$.name" : data.name,

       } },
      // {
      //   new: true,
      //   arrayFilters: [ { "group._id": { $eq: mongoose.Types.ObjectId(groupId) } } ]
      // }
    ) 
    return this.getSingleUser(id)
  }
  removeGroup = async (id, groupId)=>{
    const updatedUser = await User.findByIdAndUpdate(id, {
      $pull:{groups:{_id:mongoose.Types.ObjectId(groupId)}}
    }, {new:true}) 
    return this.getSingleUser(id)
  }
  addToCircle = async (id, data)=>{
    await User.findByIdAndUpdate(id, {
      $push:{[data.circleName]:mongoose.Types.ObjectId(data.contactId)},
    }, {new:true}) 
    const users = await Promise.all([this.getSingleUser(id), this.getSingleUser(data.contactId)])
    return {user:users[0], addedContact:users[1]}
  }
  removeFromCircle = async (id, data)=>{
    await User.findByIdAndUpdate(id, 
      {
      $pull:{[data.circleName]:mongoose.Types.ObjectId(data.contactId)},
      },
      {new:true}
      )
    await User.findByIdAndUpdate(id,{
      $pull:{'groups.$[group].members': mongoose.Types.ObjectId(data.contactId)  }
    }, 
    {
      arrayFilters:[{'group.members': mongoose.Types.ObjectId(data.contactId),'group.type': data.circleName}],
      multi: true,
    }) 
    const user = await this.getSingleUser(id);
    return {user, removedContactId:data.contactId}
  }
  giveFeedbacks = async (id, data)=>{
    const updatedUser = await User.findByIdAndUpdate(id, {
      $push:{feedbacks:data.feedbacks}
    }, {new:true}) 
    return this.getSingleUser(id)
  }
}

export default new UserController();