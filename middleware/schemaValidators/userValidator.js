import joi from 'joi';
import joiObjectId from 'joi-objectid';
const Joi = joi;
Joi.objectId = joiObjectId(Joi);

export const signupUser = (req, res, next) => {
  const schema = Joi.object({
    firstName: Joi.string()
      .trim()
      .pattern(
        new RegExp(
          /^([\wÀ-ÿ'](?:(?:[\wÀ-ÿ']|(?:\.(?!\.))){0,28}(?:[\wÀ-ÿ'])))$/
        )
      )
      .required(),
    lastName: Joi.string()
      .trim()
      .pattern(
        new RegExp(
          /^([\wÀ-ÿ'](?:(?:[\wÀ-ÿ']|(?:\.(?!\.))){0,28}(?:[\wÀ-ÿ'])))$/
        )
      )
      .required(),
    email: Joi.string()
      .pattern(
        new RegExp(
          /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/
        )
      )
      .required(),
    password: Joi.string().min(6).max(30).required(),
    activateLocation: Joi.boolean(),
    activateNotification: Joi.boolean(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};
export const socialAuthUser = (req, res, next) => {
  const schema = Joi.object({
    firstName: Joi.string().pattern(
      new RegExp(
        /^([\wÀ-ÿ'](?:(?:[\wÀ-ÿ']|(?:\.(?!\.))){0,28}(?:[\wÀ-ÿ'])))$/
      )
    ).required(),
    lastName: Joi.string().pattern(
      new RegExp(
        /^([\wÀ-ÿ'](?:(?:[\wÀ-ÿ']|(?:\.(?!\.))){0,28}(?:[\wÀ-ÿ'])))$/
      )
    ).required(),
    avatar: Joi.string().allow(null),
    social: Joi.string(),
    socialID: Joi.string(),
    email: Joi.string()
      .pattern(
        new RegExp(
          /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/
        )
      )
      .allow(null)
  });
  const { error, value } = schema.validate(req.body);
    if (error) {
    return res.status(400).json({ message: error.message });
  }
    next();
};
export const resetPassword = (req, res, next) => {
  const schema = Joi.object({
    password: Joi.string().min(3).max(30).required(),
    retypepassword: Joi.required().valid(Joi.ref("password")),
    jwt: Joi.string().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};
export const getNewUsers = (req, res, next) => {
  const schema = Joi.object({
    initialFetch: Joi.boolean().required(),
    lastId: Joi.when("initialFetch", {
      is: false,
      then: Joi.objectId().required(),
      otherwise: Joi.forbidden(),
    }),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

export const sendVerificationEmail = (req, res, next) => {
  const schema = Joi.string()
  .pattern(
    new RegExp(
      /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/
    )
  )
  .required();

  const { error, value } = schema.validate(req.params.email);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

export const loginUser = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string()
      .pattern(
        new RegExp(
          /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/
        )
      )
      .required(),
    password: Joi.string().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

export const changeActivityStatus = (req, res, next) => {
  const schema = Joi.object({
    activityStatus: Joi.string().valid("online", "offline").required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

export const getUserData = (req, res, next) => {
  const schema = Joi.object({
    profilePage: Joi.boolean().required(),
    userProfile: Joi.boolean().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

export const getPosts = (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.objectId().required(),
    lastId: Joi.objectId().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

export const getUserProfileData = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    profilePage: Joi.boolean().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

export const getUserProfileFollowers = (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.objectId().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

export const getUserProfileFollowings = (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.objectId().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

export const updateUser = (req, res, next) => {
  const validateObj = {
    ...req.body,
    // username: req.body.username.trim().toLowerCase(),
  };

  const schema = Joi.object({
    firstName: Joi.string()
      .pattern(
        new RegExp(
          /^([\wÀ-ÿ'](?:(?:[\wÀ-ÿ']|(?:\.(?!\.))){0,28}(?:[\wÀ-ÿ'])))$/
        )
      )
      .min(3)
      .max(30)
      ,
    lastName: Joi.string()
      .pattern(
        new RegExp(
          /^([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)$/
        )
      )
      .min(3)
      .max(30)
      ,
    // username: Joi.string()
    //   .invalid("login", "register", "profile")
    //   .pattern(
    //     new RegExp(
    //       /^([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)$/
    //     )
    //   )
    //   .min(3)
    //   .max(30)
    //   .required(),
    email: Joi.string()
      .pattern(
        new RegExp(
          /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/
        )
      )
      ,
    bio: Joi.string().max(250).allow(""),
  });

  const { error, value } = schema.validate(validateObj);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

export const searchByUsername = (req, res, next) => {
  const schema = Joi.object({
    query: Joi.string().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

export const followUser = (req, res, next) => {
  const schema = Joi.object({
    userId: Joi.objectId().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};
