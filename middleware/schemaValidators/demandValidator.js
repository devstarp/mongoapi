const Joi = require("joi");
Joi.objectId = require("joi-objectid")(Joi);

exports.getPosts = (req, res, next) => {
  const schema = Joi.object({
    initialFetch: Joi.boolean().required(),
    lastId: Joi.when("initialFetch", {
      is: false,
      then: Joi.objectId().required(),
      otherwise: Joi.forbidden()
    })
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

exports.getPostLikes = (req, res, next) => {
  const schema = Joi.object({
    postId: Joi.objectId().required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

exports.getPostsByHashtag = (req, res, next) => {
  const schema = Joi.object({
    initialFetch: Joi.boolean().required(),
    hashtag: Joi.string()
      .min(1)
      .required(),
    lastId: Joi.when("initialFetch", {
      is: false,
      then: Joi.objectId().required(),
      otherwise: Joi.forbidden()
    })
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

exports.getPostsByLocation = (req, res, next) => {
  const schema = Joi.object({
    initialFetch: Joi.boolean().required(),
    coordinates: Joi.string()
      .min(3)
      .required(),
    lastId: Joi.when("initialFetch", {
      is: false,
      then: Joi.objectId().required(),
      otherwise: Joi.forbidden()
    })
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

exports.getPost = (req, res, next) => {
  const schema = Joi.object({
    postId: Joi.objectId().required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

exports.likePost = (req, res, next) => {
  const schema = Joi.object({
    postId: Joi.objectId().required(),
    authorId: Joi.objectId().required()
  });

  const { error, value } = schema.validate(req.params);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

exports.deletePost = (req, res, next) => {
  const schema = Joi.object({
    postId: Joi.objectId().required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

exports.createDemand = (req, res, next) => {
  const validateObject = Object.assign({}, req.body);
  // validateObject.tags = JSON.parse(validateObject.tags);

  const schema = Joi.object({
    title: Joi.string().required(),
    // user: Joi.string().required(),
    // tags: Joi.array().required(),
    // coordinates: Joi.string()
    //   .allow("")
    //   .required(),
    // locationName: Joi.string()
    //   .allow("")
    //   .required(),
    // photo: Joi.string().required()
  });

  const { error, value } = schema.validate(validateObject);
  console.log(error)
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};
