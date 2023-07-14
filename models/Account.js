import mongoose from 'mongoose'
mongoose.Promise = global.Promise;
const GroupSchema = new mongoose.Schema({
  type:{
    type:String,
    enum:['friends', 'families', 'neighbors'],
    default: 'friends'
  },
  name:{
    type:String,
  },
  members:[{
    type:mongoose.Types.ObjectId,
    reference:'User'
  }]
})
const AccountSchema = new mongoose.Schema({
  user:{
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: "You must supply an author"
  },
  type:{
    type: String,
    default: 'GENERAL'
  },
  avatar:{
    type: String,
  },
  coverImage:{
    type: String,
  },
  firstName: {
    type: String,
    // minlength: 3,
    maxlength: 30,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    // minlength: 3,
    maxlength: 30,
    trim: true,
  },
  availability:{
    type: String,
  },
  presentation:{
    type: String,
  },
  name:{
    type: String,
  },
  industry:{
    type: String,
  },
  phone:{
    type: String,
  },
  email:{
    type: String,
  },
  website:{
    type: String,
  },
  sn:{
    type: String,
  },
  skills:[{
    type: String,
  }],
  feedbacks:[{
    type:String,
  }],
  addressComponents: [{
    type: Object,
  }],
  formattedAddress:{
    type:String,
  },
  location:{
    type: Object,
  },
  subscribers:[{
    type:mongoose.Types.ObjectId,
    reference:'User'
  }],
  groups:[{
    type:GroupSchema
  }],
},{
  timestamps:true
});
AccountSchema.index({ firstName: "text", lastName: "text", location:'2dsphere'});
export default mongoose.model("Account", AccountSchema);
