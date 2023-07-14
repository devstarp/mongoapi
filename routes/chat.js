import ChatController from '../controllers/chatController.js';
import { sendMessage, sendReadMessage } from '../handlers/messageHandler.js';
import { authorizedCheck } from '../middleware/checkAuth.js';
import uploadPhotos from '../middleware/uploadPhotos.js'
class ChatRoomRoute {
	constructor(router) {
		this.router = router;
		this.registerRoutes();
	}

	registerRoutes() {
    this.router.get(
      "/v1/chatRoom/", 
      authorizedCheck, 
      this.getChatRooms.bind(this)
    );
    this.router.post(
      "/v1/chatRoom/", 
      authorizedCheck, 
      this.createChatRoom.bind(this)
    );
    this.router.get(
      "/v1/chatRoom/:roomId/message", 
      authorizedCheck, 
      this.getMessages.bind(this)
    );
    this.router.post(
      "/v1/chatRoom/:roomId/message/send", 
      authorizedCheck, 
      this.sendMessage.bind(this)
    );
    
    this.router.post(
      "/v1/chatRoom/:roomId/message/read/:userId", 
      authorizedCheck, 
      this.readMessages.bind(this)
    );
	}
  getChatRooms(req,res,next){
    ChatController.getChatRooms(req.query)
      .then((data) => {
        res.send(data);
      })
      .catch(next);
  }
  createChatRoom(req,res,next){
    ChatController.createChatRoom(req.body)
      .then((data) => {
        res.send(data);
      })
      .catch(next);
  }
  getMessages(req,res,next){
    ChatController.getMessages(req.params.roomId)
      .then((data) => {
        res.send(data);
      })
      .catch(next);
  }
  sendMessage(req,res,next){
    ChatController.sendMessage({
      roomId: req.params.roomId,
      sender: req.body.senderId,
      text: req.body.text,
      receiver: req.body.receiverId,
      // messageType: req.body.messageType
    })
      .then((data) => {
        res.send(data);
      })
      .catch(next);
  }
  readMessages(req,res,next){
    ChatController.readMessages(req.params.roomId, req.params.userId)
      .then((data) => {
        res.send(data);
      })
      .catch(next);
  }
}

export default ChatRoomRoute;

