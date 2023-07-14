import mongoose from 'mongoose'
mongoose.Promise = global.Promise;
const receiverSchema = new mongoose.Schema({
  user:{type: mongoose.Schema.Types.ObjectId, ref: "User"},
  read:{type:Boolean, default:false}
},{_id:false, timestamps:false});
const NotificationSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Notification creator
  receiver: [receiverSchema], // Ids of the receivers of the notification
  description:{type:String, default:''},
  demand: { type: mongoose.Schema.Types.ObjectId, ref: "Demand" },
},{
  timestamps:true
});

export default mongoose.model("Notification", NotificationSchema);
