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
export default async (req, res, next) => {
    const storage = multer.diskStorage({
      //multers disk storage settings
      destination: (req, file, cb) => {
        cb(null, `./public/images/${req.params.directory}/`);
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
        console.log(file)
        checkFileType(file, cb);
      },
      limits: {
        fileSize: 10485760, //10 MB
      },
    }).array("photo");
    
    upload(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      console.log(req.files)
      if (req.files){
        const photos = req.files.map(file=>file.path.replace('//','/'));
        return res.status(200).json({files: req.files} );
      }
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