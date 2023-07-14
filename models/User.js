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
export const AccountSchema = new mongoose.Schema({
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
    required: true,
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
  telephone:{
    type: String,
  },
  email:{
    type: String,
  },
  website:{
    type: String,
  },
  siretNumber:{
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
const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
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
  social:{
    type:String,
  },
  socialID:{
    type:String,
  },
  mobile:{
    type:String,
  },
  activateLocation:{
    type:Boolean,
    default:false,
  },
  activateNotification:{
    type:Boolean,
    default:false,
  },
  email: {
    type: String,
    trim: true,
    // required: true,
    maxlength: 40,
    unique: true,
    sparse:true,
    match: /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/,
  },
  password: {
    trim: true,
    minlength: 3,
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  activityStatus: {
    type: String,
    default: "offline",
  },
  activated: {
    type: Boolean,
    default: false,
  },
  profiles:[{ 
    type:AccountSchema 
  }],
  accounts:[{
    type: mongoose.Schema.ObjectId,
    ref: "Account",
    required: "You must supply an author"
  }],
  friends:[{
    type:mongoose.Types.ObjectId,
    reference:'User'
  }],
  families:[{
    type:mongoose.Types.ObjectId,
    reference:'User'
  }],
  neighbors:[{
    type:mongoose.Types.ObjectId,
    reference:'User'
  }],
  groups:[{
    type:GroupSchema
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
  }
},{
  timestamps:true
});
UserSchema.index({ firstName: "text", lastName: "text", location:'2dsphere'});
export default mongoose.model("User", UserSchema);
