import mongoose from 'mongoose'
mongoose.Promise = global.Promise;

const MessageSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref:'ChatRoom' },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: {
    type: String,
    trim: true,
    minlength: 1
  },
  messageType: {
    type: String,
    required: true,
    default:'text',
  },
  photo: String,
  read: { type: Boolean, default: false },
},{
  timestamps:true
});

export default mongoose.model("Message", MessageSchema);
