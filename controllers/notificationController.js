import mongoose from 'mongoose';
const Notification = mongoose.model("Notification");

class NotificationController {
	constructor() {}
  getNotifications = async (params) => {
    const  query = [
      {
        $match: {'receiver.user': mongoose.Types.ObjectId(params.userId)},
      },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      {
        $lookup: {
        from: "users",
        let: {userId:"$sender"},
        pipeline:[
          {$match:{$expr:{$eq:['$_id','$$userId']}}},
          {$project:{
            firstName:1, 
            lastName:1,
            ['profiles']:1,
            _id:1,
          }}
        ],
        as: "senders",
      }
      },
      {
        $lookup: {
          from: "demands",
          localField: "demand",
          foreignField: "_id",
          as: "demands"
        }
      },
      {
        $project: {
          _id: 1,
          // read: {$find:['$receiver', ]},
          message: 1,
          sender: {$arrayElemAt:['$senders',0]},
          demand: {$arrayElemAt:['$demands',0]},
          reply: 1,
          createdAt: 1,
        }
      }
    ];
    const notifications =  await Notification.aggregate(query)
    return notifications
  };
  createNotification = async (data) =>{
    return await new Notification(data).save();
  }
  readNotifications = async (notificationIds) => {
    const notifications  =  await Notification.updateMany(
      { _id: { $in: notificationIds } },
      { $set: { read: true } },
      { multi: true }
    )
    return notifications
  };
}


export default new NotificationController();