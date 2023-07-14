import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
export const testSendEmail = (req,res) => {
  // config for mailserver and mail, input your data
  const config = {
    mailserver: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, 
      auth: {
        user: process.env.EMAILUSER,
        pass: process.env.EMAILPASS,
      },
    },
    mail: {
      from: process.env.EMAILUSER,
      to: 'infolitesoftwaresolution@gmail.com',
      subject: "Account verification",
      text:'Test Email'
    },
  };

  const sendMail = async ({ mailserver, mail }) => {
    // create a nodemailer transporter using smtp
    let transporter = nodemailer.createTransport(mailserver);


    // send mail using transporter
    await transporter.sendMail(mail);
  };

  sendMail(config).then(()=>{
    res.status(200).json('sent the Email')
  }).catch((err) =>{ 
    res.status(500).json({ message: err.message });
  });
};
export const sendVerificationEmail = (data) => {
  const { email, _id, username } = data;
  const token = jwt.sign(
    {
      email,
      _id,
    },
    process.env.JWT_KEY,
    {
      expiresIn: "30m",
    }
  );
  console.log('email verify token====', token)
  // config for mailserver and mail, input your data
  const config = {
    mailserver: {
      service: "gmail",
      auth: {
        user: process.env.EMAILUSER,
        pass: process.env.EMAILPASS,
      },
    },
    mail: {
      from: process.env.EMAILUSER,
      to: email,
      subject: "Account verification",
      template: "emailVerify",
      context: {
        token,
        username,
        host: process.env.HOST,
      },
    },
  };

  const sendMail = async ({ mailserver, mail }) => {
    // create a nodemailer transporter using smtp
    let transporter = nodemailer.createTransport(mailserver);

    transporter.use(
      "compile",
      hbs({
        viewEngine: {
          partialsDir: "./emailViews/",
          defaultLayout: "",
        },
        viewPath: "./emailViews/",
        extName: ".hbs",
      })
    );

    // send mail using transporter
    await transporter.sendMail(mail);
  };

  sendMail(config).catch((err) => console.log(err));
};
export const sendPasswordResetEmail = (data) => {
  const { email, _id, username } = data;
  const token = jwt.sign(
    {
      email,
      _id,
    },
    process.env.JWT_KEY,
    {
      expiresIn: "10m",
    }
  );
  console.log("sending password reset====", token);

  // config for mailserver and mail, input your data
  const config = {
    mailserver: {
      service: "gmail",
      auth: {
        user: process.env.EMAILUSER,
        pass: process.env.EMAILPASS,
      },
    },
    mail: {
      from: process.env.EMAILUSER,
      to: email,
      subject: "Password reset",
      template: "passwordReset",
      context: {
        token,
        username,
        host: process.env.HOST,
      },
    },
  };

  const sendMail = async ({ mailserver, mail }) => {
    // create a nodemailer transporter using smtp
    let transporter = nodemailer.createTransport(mailserver);

    transporter.use(
      "compile",
      hbs({
        viewEngine: {
          partialsDir: "./emailViews/",
          defaultLayout: "",
        },
        viewPath: "./emailViews/",
        extName: ".hbs",
      })
    );

    // send mail using transporter
    await transporter.sendMail(mail);
  };

  sendMail(config).catch((err) => console.log(err));
};
