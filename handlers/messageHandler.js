export const sendMessage = (req, data) => {
  const io = req.app.get("socketio");

  const { message, receiver } = { ...data };
  io.sockets.in(receiver._id).emit("newMessage", {
    ...message
  });
};

export const sendReadMessage = (req, data) => {
  const io = req.app.get("socketio");

  const { messageIds, roomId, receiver } = { ...data };
  io.sockets.in(receiver).emit("readMessages", {
    messageIds,
    roomId
  });
};

export const sendImageMessageRequest = (req, data) => {
  const io = req.app.get("socketio");

  const { message, receiver } = { ...data };
  io.sockets.in(receiver._id).emit("imageMessageRequest", {
    ...message
  });
};

export const sendImageMessage = (req, data) => {
  const io = req.app.get("socketio");

  const { message, receiver } = { ...data };
  io.sockets.in(receiver._id).emit("imageMessage", {
    ...message,
    receiver: receiver._id
  });
};

export const sendRoom = (req, data) => {
  const io = req.app.get("socketio");
  const { userId, room } = data;
  io.sockets.in(userId).emit("newRoom", {
    ...room,
    lastMessage: []
  });
};

export const sendActivityStatus = data => {
  const { req, user, userId, activityStatus } = data;
  const io = req.app.get("socketio");
  io.sockets.in(userId).emit("activityStatusUpdate", {
    activityStatus,
    user
  });
};

export const handleCall = (req, data) => {
  const io = req.app.get("socketio");
  const {
    room: { user }
  } = data;
  io.sockets.in(user._id).emit("newCall", {
    ...data
  });
};

export const handleAnswer = (req, data) => {
  const io = req.app.get("socketio");
  const { userId } = data;
  io.sockets.in(userId).emit("newAnswer", {
    ...data
  });
};
