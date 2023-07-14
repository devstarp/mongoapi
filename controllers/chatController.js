import mongoose from 'mongoose';
const ChatRoom = mongoose.model("ChatRoom");
const Message = mongoose.model("Message");

class ChatController {
	constructor() {}
  getMatchQuery(params) {
    let {
      id,
      type,
      userId,
      members,
      demand
    } = params;
    let queries = [];
    if (type){
      queries.push({type:type})
    }
    if (id){
      queries.push({_id:mongoose.Types.ObjectId(id)})
    }
    if (userId){
      queries.push({members:mongoose.Types.ObjectId(userId)})
    }
    if (members&&members.length>0){
      queries.push({
        members:
        {$all:members.map(member=>mongoose.Types.ObjectId(member))}
      })
    }
    if (demand){
      queries.push({demand:{$eq:mongoose.Types.ObjectId(demand)}})
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
  getChatRooms = async (params={}) => {
    const matchQuery = this.getMatchQuery(params);
    const itemsAggregation=[];
      itemsAggregation.push({ $match: matchQuery });
      itemsAggregation.push({
        $lookup: {
          from: "users",
          let: { memberId: "$members" },
          as: "members",
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$_id", "$$memberId"] },
              },
            },
            { 
              $project: { 
                firstName:1, 
                lastName:1,
                ['profiles']:1,
                _id:1, 
            } 
            }, // add sort if needed (for example, if you want first 100 comments by creation date)
          ],
        },
      },);
      itemsAggregation.push({
        $lookup: {
          from: "messages",
          as: "lastMessages",
          let: { indicator_id: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$roomId", "$$indicator_id"] },
              },
            },
            { $sort: { createdAt: -1 } }, // add sort if needed (for example, if you want first 100 comments by creation date)
            { $limit: 1 },
          ],
        },
      });
      itemsAggregation.push({
        $lookup: {
          from: "demands",
          as: "demands",
          let: { demandId: "$demand" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$demandId"] },
              },
            },
            { $limit: 1 },
          ],
        },
      });
      itemsAggregation.push({$project: {
        type:1,
        members: 1,
        // messages: 1,
        roomName: 1,
        createdAt: 1,
        updatedAt: 1,
        lastMessage: {$arrayElemAt:['$lastMessages',0]},
        demand: {$arrayElemAt:['$demands',0]},
        //averageRating: { $avg: { $size: "$messages" } }
      }});
      itemsAggregation.push({ $sort: { "lastMessage.createdAt": -1 } });
    const chatRooms = await ChatRoom.aggregate(itemsAggregation)
    return chatRooms
  };
  getSingleChatRoom = async(id) => {
    return this.getChatRooms({ id }).then((items) => (items.length > 0 ? items[0] : {}));
	}
  createChatRoom = async (data) => {
    const chatRoom = await this.getChatRooms({type: data.type, members:data.members, demand:data.demand})
    if(chatRoom.length===0){
      const members = data.members.map(member=>mongoose.Types.ObjectId(member))
      const demand = mongoose.Types.ObjectId(data.demand);
      const newChat = await new ChatRoom({...data, members, demand}).save();
    return this.getSingleChatRoom(newChat._id)
    }else{
      return chatRoom[0]
    }
  };
  deleteChatRoom = async (data) => {
    await ChatRoom.deleteOne(data);
    return {message:'Successed deleted the chat.'}
  };
  getMessages = async (id) => {
    const messages = await Message.find({roomId:mongoose.Types.ObjectId(id)})
    .limit(50)
    .sort({ createdAt: -1 })
    return {messages}
  }
  sendMessage = async (data) => {
    const message = await new Message(data).save()
    if(message)  {
      const resChat = await ChatRoom.findByIdAndUpdate(
        { _id: data.roomId },
        { $inc: { messages: 1 } }
      )
      return this.getMessages(resChat._id); 
    }else{
      return Promise.reject()
    }
  };
  readMessages = async ( roomId, receiverId ) => {
    await Message.updateMany(
      {
        receiver: mongoose.Types.ObjectId(receiverId),
        roomId: mongoose.Types.ObjectId(roomId)
      },
      { $set: { read: true } },
      { multi: true }
    )
    return this.getSingleChatRoom(roomId)
  };
}


export default new ChatController();
