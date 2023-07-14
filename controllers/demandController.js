import mongoose from 'mongoose';
import UserController from './userController.js';
import NotificationController from './notificationController.js';
import ChatController from './chatController.js';
const Demand = mongoose.model("Demand");
const ChatRoom = mongoose.model("ChatRoom");
const Notification = mongoose.model("Notification");

class DemandController {
	constructor() {}
  getMatchQuery(params) {
    let {
      types,
      dateFrom,
      dateTo,
      id,
      userId,
      authorAccountId,
      participant,
      country,
      adminLevel1,
      adminLevel2,
      dateFilter,
      authorType,
      hasDate
    } = params;
    let queries = [];
    if (id){
      queries.push({_id:{$eq:mongoose.Types.ObjectId(id)}})
    }
    if (userId){
      queries.push({user:{$eq:mongoose.Types.ObjectId(userId)}})
    }
    if (authorAccountId){
      queries.push({authorAccount:{$eq:mongoose.Types.ObjectId(authorAccountId)}})
    }
    if (participant){
      queries.push({'participants.user':mongoose.Types.ObjectId(participant)})
      queries.push({'participants.state': {$ne:'refused'}})
    }
    if (authorType && authorType.length > 0) {
      if (authorType.includes(',')) {
        // multiple values
        queries.push({
          authorType: { $in: authorType.split(',') },
        });
      } else {
        // no value
        queries.push({
          authorType: authorType,
        });
      }
    }
    if (types && types.length > 0) {
      if (types.includes(',')) {
        // multiple values
        queries.push({
          type: { $in: types.split(',') },
        });
      } else {
        // no value
        queries.push({
          type: types,
        });
      }
    }
    if (hasDate){
      queries.push({'startDate': {$exists:true}})
    }
    if (dateFrom && dateTo) {
      if(dateFilter==='start'){
        queries.push({
          startDate: {$gte: new Date(dateFrom), $lte:new Date(dateTo)},
        });
      }else if (dateFilter==='end'){
        queries.push({
          endDate: {$gt: new Date(dateFrom), $lt:new Date(dateTo)},
        });
      }else{
      queries.push({
        startDate: { $lt:new Date(dateTo)},
      });
      queries.push({
        endDate: { $gte: new Date(dateFrom)},
      });
      }
    }
    if (country&&country.length>0) {
      queries.push({
        'addressComponents.short_name': country,
      });
    }
    if (adminLevel1&&adminLevel1.length>0) {
      queries.push({
        'addressComponents.short_name': adminLevel1,
      });
    }
    if (adminLevel2&&adminLevel2.length>0) {
      queries.push({
        'addressComponents.short_name': adminLevel2,
      });
    }
    
    let matchQuery = {};
    if (queries.length === 1) {
      matchQuery = queries[0];
    } else if (queries.length > 1) {
      matchQuery = {
        $and: queries,
      };
    }
  
    return matchQuery;
  }
	getDemands = async(params = {}) => {
    const matchQuery = this.getMatchQuery(params);
    console.log('query===', matchQuery)
    const itemsAggregation = [];

    if(params.latlng&&params.latlng.includes(',')){
      const coordinates=params.latlng.split(',').map(coor=>Number(coor));
      console.log('coordinates===', coordinates)
      itemsAggregation.push({ $geoNear: {
        near:{type:'Point', coordinates},
        key: "location",
        maxDistance: Number( params.distance) || 20000,
        distanceField: "dist.calculated",
      } });
    }
    itemsAggregation.push({ $match: matchQuery });
    itemsAggregation.push({ $lookup:  
      {
        from: "users",
        let: {userId:"$user", accountId:"$authorAccount"},
        pipeline:[
          {$match:{$expr:{$eq:['$_id','$$userId']}}},
          {$unwind:'$profiles'},
          {$project:{
            _id:1,
            accountId:'$profiles._id',
            avatar:'$profiles.avatar',
            name:'$profiles.name',
            firstName:'$profiles.firstName',
            type:'$profiles.type',
            lastName:'$profiles.lastName',
            // name:{$or:['$profile.name',  {'$concat':['$profile.firstName', ' ', '$profile.lastName']}]},
          }},
          {$match:{$expr:{$eq:['$accountId','$$accountId']}}},
          // {$match:{$expr:{$eq:['$_id','$$accountId']}}},
        ],
        as: "authors",
      },
    });
    itemsAggregation.push({ $project: {
      user: {$arrayElemAt:['$authors',0]},
      authorType:1,
      _id: 1,
      type:1,
      subType:1,
      category:1,
      shareCircles:1,
      shareUsers:1,
      description:1,
      predict:1,
      predictRequired:1,
      price:1,
      specialPrice:1,
      startDate:1,
      endDate:1,
      photos:1,
      title:1,
      createdAt:1,
      participants: 1,
      invitees: 1,
      formattedAddress:1,
      location:1,
      dist:1,
      state: {
        $cond:[
        {$eq:['$canceled', false]},
        {
          $cond:[
            {$not:['$startDate']},
            'noStart',
            {
              $cond:[ 
                { $lt: [ "$startDate", new Date() ] }, 
                {
                  $cond: [ 
                    {$and:[ 
                      { $lt: ['$startDate', '$endDate'] },
                      { $lt: [ "$endDate", new Date() ] }, 
                      ] 
                    }, 
                    'terminated', 
                    {
                      $cond: [ 
                        {$not:['$endDate']},
                        'noEnd', 
                        'processing' ,
                      ]
                    } ,
                  ]
                }, 
                'notYet' 
              ]
            },
          ]
        },
        'canceled' 
      ]}
    }})
    itemsAggregation.push({ $sort: {createdAt:-1} });
    const demands = await Demand.aggregate(itemsAggregation)
    console.log('demands.length====',demands.length)
    return {demands}
	}
  getSingleDemand = async(id) => {
    return this.getDemands({ id }).then((items) => (items.demands.length > 0 ? items.demands[0] : {}));
	}
  createDemand = async (data) => {
    const userId = data.user;
    const newDemand = await new Demand(data).save();
    let contacts= [];
    const user = await UserController.getSingleUser(userId);
    if (data.shareCircles[0]==='all'){
      const resUsers = await UserController.getUsers({userId},false)
      contacts= resUsers.users.map(user=>user._id)
      }else{
        for (let index = 0; index < data.shareCircles.length; index++) {
            const shareCircle = data.shareCircles[index];
            contacts = [...contacts,...user[shareCircle]]
    }
    if(data.shareUsers.length>0){
      contacts= [...contacts, ...data.shareUsers]
    }
    contacts = await UserController.getUsers({ids:contacts.join(',')},false)
    contacts = contacts.users.filter(contact=>!!contact.activateNotification).map(contact=>contact._id)
    contacts.length >0 &&  NotificationController.createNotification({
      sender:data.user, 
      receiver:contacts.map(contact=>({user:mongoose.Types.ObjectId(contact)})), 
      demand:newDemand._id
    })
    }
    return this.getSingleDemand(newDemand.id);
  };
  updateDemand = async (id, data)=> {
    if (!mongoose.isValidObjectId(id)) {
      return Promise.reject('Invalid identifier');
    }
    const demand =  await Demand.findByIdAndUpdate(id, data);
    return this.getSingleDemand(demand._id)
  }
  deleteDemand = async (id)=> {
    const res = await Promise.all([
      Demand.findByIdAndDelete(id),
      Notification.deleteMany({demand:mongoose.Types.ObjectId(id)}),
      ChatRoom.deleteMany({demand:mongoose.Types.ObjectId(id)})
    ])
    if(res[0]._id&&res[1].ok===1&&res[2].ok===1){
      return { message: "Successed to delete this demand"}
    }else{
      return Promise.reject()
    }
  }
  terminateDemand = async (id, data)=> {
    if (!mongoose.isValidObjectId(id)) {
      return Promise.reject('Invalid identifier');
    }
    const demand =  await Demand.findByIdAndUpdate(id, {
      endDate: new Date()
    });
    return this.getSingleDemand(demand._id)
  }
  requestParticipation = async (id, data)=>{
    const resDemand = await Demand.findByIdAndUpdate(
      id,
      {
        $push:{participants:{
          user:mongoose.Types.ObjectId(data.userId),
          predict:data.predict,
        }
      }
    })
    if(resDemand){
      const resChat = await ChatController.createChatRoom({
        members:[data.userId,resDemand.user],
        demand:resDemand._id,
        state:'pending',
        type:'demand',
      })
      if(resChat){
        ChatController.sendMessage({
          roomId: resChat._id,
          sender: mongoose.Types.ObjectId(data.userId),
          text: data.message,
          receiver: mongoose.Types.ObjectId(resDemand.user),
        })
      }
      return this.getSingleDemand(resDemand._id)
    } else{
      return Promise.reject()
    }
  }
  interestParticipation = async (id, data)=>{
    const resDemand = await Demand.findByIdAndUpdate(
      id,
      {
        $push:{participants:{
          user:mongoose.Types.ObjectId(data.userId),
          state: 'interesting',
        }
      }
    })
    if(resDemand){
      return this.getSingleDemand(resDemand._id)
    } else{
      return Promise.reject()
    }
  }
  cancelParticipation = async (id, userId)=>{
    const resDemand = await Demand.findByIdAndUpdate(
      id,
      {
        $pull:{participants:{user:mongoose.Types.ObjectId(userId)}
      }
    })
    if(resDemand){
      // ChatController.deleteChatRoom({
      //   members:mongoose.Types.ObjectId(userId),
      //   demand:mongoose.Types.ObjectId(resDemand._id),
      // })
      return this.getSingleDemand(resDemand._id)
    } else{
      return Promise.reject()
    }
  }
  acceptParticipant = async (id, data)=>{
    const resDemand = await Demand.findByIdAndUpdate(
      id,
      { $set: { "participants.$[participant].state" : 'accepted' } },
      {
        multi: true,
        arrayFilters: [ { "participant.user": { $eq: mongoose.Types.ObjectId(data.contactId) } } ]
      }
    )
    if(resDemand){
      return this.getSingleDemand(resDemand._id)
    } else{
      return Promise.reject()
    }
  }
  refuseParticipant = async (id, data)=>{
    const resDemand = await Demand.findByIdAndUpdate(
      id,
      { $set: { "participants.$[participant].state" : 'refused' } },
      {
        multi: true,
        arrayFilters: [ { "participant.user": { $eq: mongoose.Types.ObjectId(data.contactId) } } ]
      }
    )
    if(resDemand){
      return this.getSingleDemand(resDemand._id)
    } else{
      return Promise.reject()
    }
  }
  inviteContact = async (demandId, userId, data )=>{
    const resDemand = await Demand.findByIdAndUpdate(
      demandId,
      {
        $push:{invitees:{user:mongoose.Types.ObjectId(data.contactId)}
      }
    })
    if(resDemand){
      if(resDemand._id===data.contactId){
        return Promise.reject(`You can't invite the owner to his demand.`)
      }
        const resChats = await Promise.all([
        ChatController.createChatRoom({
          members:[userId,data.contactId],
          demand:resDemand._id,
          state:'pending',
          type:'invitation',
        }),
        // userId!==resDemand.user.toString()&&   ChatController.createChatRoom({
        //   members:[userId,resDemand.user],
        //   demand:resDemand._id,
        //   state:'pending',
        //   type:'invitation',
        // }),
      ])
        resChats.length>2&&resChat[1]._id&& ChatController.sendMessage({
          roomId: resChats[1]._id,
          sender: mongoose.Types.ObjectId(userId),
          text: data.message,
          receiver: mongoose.Types.ObjectId(resDemand.user),
        })
        ChatController.sendMessage({
          roomId: resChats[0]._id,
          sender: mongoose.Types.ObjectId(userId),
          text: data.message,
          receiver: mongoose.Types.ObjectId(data.contactId),
        })
      return this.getSingleDemand(resDemand._id)
    } else{
      return Promise.reject('No Required Demand')
    }
  }
  acceptInvitation = async (id, userId)=>{
    const resDemand = await Demand.findByIdAndUpdate(
      id,
      { $set: { "invitees.$[invitee].state" : 'accepted' } },
      {
        multi: true,
        arrayFilters: [ { "invitee.user": { $eq: mongoose.Types.ObjectId(userId) } } ]
      }
    )
    if(resDemand){
      return this.getSingleDemand(resDemand._id)
    } else{
      return Promise.reject()
    }
  }
  refuseInvitation = async (id, userId)=>{
    const resDemand = await Demand.findByIdAndUpdate(
      id,
      { $set: { "invitees.$[invitee].state" : 'refused' } },
      {
        multi: true,
        arrayFilters: [ { "invitee.user": { $eq: mongoose.Types.ObjectId(userId) } } ]
      }
    )
    if(resDemand){
      return this.getSingleDemand(resDemand._id)
    } else{
      return Promise.reject()
    }
  }
  giveFeedback = async (id, data )=>{
    const resDemand = await Demand.findByIdAndUpdate(
      id,
      {
        $push:{feedbacks:{
          user:mongoose.Types.ObjectId(data.userId),
          feedback:data.feedbacks.join(','),
        }
      }
    })
    if(resDemand){
      await UserController.giveFeedbacks(resDemand.user, data)
      return this.getSingleDemand(resDemand._id)
    } else{
      return Promise.reject()
    }
  }
  updateAllDemands =async()=>{
    return await Demand.updateMany({},[{
      // $set:{location:{type:'Point', coordinates:['$location.lng', '$location.lat'], lat:undefined, lng:undefined}}
      $set:{location:{type:'Point', lat:'', lng:''}}
    }])
  }
}

export default new DemandController();
