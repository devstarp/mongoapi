import multer from "multer";
import path from "path";
import uuidv4 from "uuid";
// Check File Type
function checkFileType(file, cb) {
    // Allowed ext
    const filetypes = /jpeg|jpg|png|gif/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);
  
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only images are allowed"));
    }
  }
  
const storage = multer.diskStorage({
    //multers disk storage settings
    destination: (req, file, cb) => {
      cb(null, "./public/images/demand-photos/");
    },
    filename: (req, file, cb) => {
      const ext = file.mimetype.split("/")[1];
      cb(null, uuidv4() + "." + ext);
    },
  });
  
  const upload = multer({
    //multer settings
    storage: storage,
    fileFilter: function (req, file, cb) {
      checkFileType(file, cb);
    },
    limits: {
      fileSize: 10485760, //10 MB
    },
  }).array("photo",3);
  
  export default async (req, res, next) => {
    upload(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      if (req.files){
        const photos = req.files.map(file=>file.path.replace('//','/'));
        req.body={photos,...JSON.parse(req.body.data)}
      }
      next()
      // Jimp.read(req.file.path, function (err, test) {
      //   if (err) throw err;
      //   test
      //     .scaleToFit(480, Jimp.AUTO, Jimp.RESIZE_BEZIER)
      //     .quality(50)
      //     .write("./public/images/demand-photos/thumbnail/" + req.body.photo);
      //   next();
      // });
    });
  };