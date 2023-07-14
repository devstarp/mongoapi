import mongoose from 'mongoose'
mongoose.Promise = global.Promise;

const ChatRoomSchema = new mongoose.Schema({
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  demand: { type: mongoose.Schema.Types.ObjectId, ref: "Demand" },
  type:{type:String, enum:['demand', 'invitation'], default:'demand'},
  state:{type:String, enum:['accepted','refused','pending', 'normal'],default:'normal'},
  lastActive: { type: Date, default: Date.now },
  messages: { type: Number, default: 0 },
},{
  timestamps:true
});

export default mongoose.model("ChatRoom", ChatRoomSchema);
