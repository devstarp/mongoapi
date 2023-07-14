function idToString(id) {
  return id.toString();
}

export const sendLikeCommenNotification = (req, values) => {
  const io = req.app.get("socketio");

  if (req.userData.userId !== req.body.authorId) {
    const { profilePicture, username } = values[0];
    const { _id, read, comment, post, type, createdAt } = values[1];
    io.sockets.in(req.body.authorId).emit("newNotification", {
      notification: {
        _id,
        read,
        comment: [{ ...comment }],
        post: [{ ...post }],
        type,
        sender: [
          {
            profilePicture,
            username
          }
        ],
        createdAt
      }
    });
  }
};

export const sendLikeCommenReplyNotification = (req, values) => {
  const io = req.app.get("socketio");

  if (req.userData.userId !== req.body.authorId) {
    const { profilePicture, username } = values[0];
    const { _id, read, reply, post, type, createdAt } = values[1];
    io.sockets.in(req.body.authorId).emit("newNotification", {
      notification: {
        _id,
        read,
        type,
        sender: [
          {
            profilePicture,
            username
          }
        ],
        reply: [{ ...reply }],
        post: [{ ...post }],
        createdAt
      }
    });
  }
};

export const sendLikePostNotification = (req, values) => {
  const io = req.app.get("socketio");

  if (req.userData.userId !== req.body.authorId) {
    const { profilePicture, username } = values[0];
    const { _id, read, post, type, createdAt } = values[1];
    io.sockets.in(req.body.authorId).emit("newNotification", {
      notification: {
        _id,
        read,

        post: [{ ...post }],
        type,
        sender: [
          {
            profilePicture,
            username
          }
        ],
        createdAt
      }
    });
  }
};

export const sendFollowNotification = (req, values) => {
  const io = req.app.get("socketio");

  if (req.userData.userId !== req.body.userId) {
    const { profilePicture, username } = values[0];
    const { _id, read, type, createdAt } = values[1];
    io.sockets.in(req.body.userId).emit("newNotification", {
      notification: {
        _id,
        read,
        type,
        sender: [
          {
            profilePicture,
            username
          }
        ],
        createdAt
      }
    });
  }
};

export const sendAddCommentReplyNotification = (req, values) => {
  const io = req.app.get("socketio");

  if (req.userData.userId !== req.body.authorId) {
    const { profilePicture, username } = values[0];
    const { _id, read, type, comment, reply, post, createdAt } = values[1];
    io.sockets.in(req.body.authorId).emit("newNotification", {
      notification: {
        _id,
        read,
        sender: [
          {
            profilePicture,
            username
          }
        ],
        post: [{ ...post }],
        comment: [{ ...comment }],
        reply: [{ ...reply }],
        type,
        createdAt
      }
    });
  }
};

export const sendAddCommentNotification = (req, values) => {
  const io = req.app.get("socketio");

  if (req.userData.userId !== req.body.authorId) {
    const { profilePicture, username } = values[0];
    const {
      _id,
      read,

      post,
      type,
      comment,
      reply,
      createdAt
    } = values[1];

    io.sockets.in(req.body.authorId).emit("newNotification", {
      notification: {
        _id,
        read,
        sender: [
          {
            profilePicture,
            username
          }
        ],

        post: [{ ...post }],
        comment: [{ ...comment }],
        reply: [{ ...reply }],
        type,
        createdAt
      }
    });
  }
};

export const sendCommentTaggedNotification = params => {
  const { req, removedUserid, user, notification } = params;
  const io = req.app.get("socketio");
  const { _id, read, type, createdAt, post } = notification;
  const { profilePicture, username } = user;

  removedUserid.forEach(user => {
    if (idToString(user._id) !== idToString(req.userData.userId)) {
      io.sockets.in(user._id).emit("newNotification", {
        notification: {
          _id,
          read,
          sender: [
            {
              profilePicture,
              username
            }
          ],

          post: [{ ...post }],
          type,
          createdAt
        }
      });
    }
  });
};

export const sendCommentMentionNotification = params => {
  const { req, removedUserid, user, notification } = params;
  const io = req.app.get("socketio");

  const { _id, read, type, createdAt, post } = notification;
  const { profilePicture, username } = user;

  removedUserid.forEach(user => {
    if (idToString(user._id) !== idToString(req.userData.userId)) {
      io.sockets.in(user._id).emit("newNotification", {
        notification: {
          _id,
          read,
          sender: [
            {
              profilePicture,
              username
            }
          ],

          post: [{ ...post }],
          type,
          createdAt
        }
      });
    }
  });
};

export const sendNewUser = params => {
  const { req, user } = params;
  const io = req.app.get("socketio");

  const { profilePicture, username, _id } = user;
  io.sockets.emit("newUser", {
    username,
    profilePicture,
    _id
  });
};
