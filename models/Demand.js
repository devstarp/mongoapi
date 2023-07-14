import mongoose from 'mongoose'
mongoose.Promise = global.Promise;
const participantSchema = new mongoose.Schema({
  user:{
    type:mongoose.Types.ObjectId,
    reference:'User',
  },
  state:{
    type:String, 
    enum:['accepted','refused','pending', 'interesting'], 
    default:'pending'
  },
  predict:{
    type:String
  },
},{_id:false, timestamps:true});
const feedbackSchema = new mongoose.Schema({
  user:{
    type:mongoose.Types.ObjectId,
    reference:'User',
  },
  feedback:{
    type:String
  },
},{_id:false, timestamps:true});
const inviteeSchema = new mongoose.Schema({
  user:{
    type:mongoose.Types.ObjectId,
    reference:'User',
  },
  state:{type:String, enum:['accepted','rejecected','pending'], default:'pending'},
},{_id:false, timestamps:true});
const DemandSchema = new mongoose.Schema({
  type:{
    type: String,
    enum: ['alert', 'give', 'sell', 'organize', 'need'],
    required: "Please choose the Type"
  },
  subType: [{
    type: String,
  }],
  category: {
    type: String,
  },
  title:{
    type: String,
    trim: true,
    required: "Please insert the title"
  },
  canceled:{
    type: Boolean,
    default:false,
  },
  shareCircles: [{
    type: String,
    trim: true,
  }],
  shareUsers: [{
    type: mongoose.Schema.ObjectId,
    reference: 'User',
  }],
  description: {
    type: String,
  },
  predict: {
    type: String,
  },
  predictRequired: {
    type: Boolean,
  },
  price: {
    type: String,
  },
  specialPrice: {
    type: String,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  photos: {
    type: [String],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: "You must supply an author"
  },
  authorAccount: {
    type: mongoose.Schema.ObjectId,
  },
  authorType:{
    type: String
  },
  participants: [participantSchema],
  feedbacks: [feedbackSchema],
  invitees: [inviteeSchema],
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
DemandSchema.index({location:'2dsphere'})
export default mongoose.model("Demand", DemandSchema);
