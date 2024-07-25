const express = require("express");
const Controller = require("../controllers/index");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const Authentication = require("../services/index");

const userStorage = multer.diskStorage({
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const imageFileFilter = function (req, file, callback) {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedImageTypes = [".png", ".jpg", ".gif", ".jpeg"];
  if (allowedImageTypes.includes(ext)) {
    callback(null, true);
  } else {
    callback(new Error("Only images are allowed"));
  }
};


const upload = multer({
  storage: userStorage,
  fileFilter: function (req, file, callback) {
    if (file.fieldname === "image") {
      imageFileFilter(req, file, callback);
    }  
    else {
      callback(new Error("Invalid fieldname"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

//post custom PrivacyPost
router.route("/createPrivacy").post(
  upload.fields([
    {
      name: "image",
      maxCount: 1,
    },
  ]),
//   Authentication.UserAuth,
  Controller.privacyController.createPrivacy
);

//update PrivacyPost
router.route("/updatePrivacy").put(
//   Authentication.UserAuth,
  upload.fields([
    {
      name: "image",
      maxCount: 1,
    },
  ]),
  Controller.privacyController.updatePrivacy
);

//delete PrivacyPost
router
  .route("/deletePrivacy/:id")
  .delete(
    // Authentication.UserAuth, 
    Controller.privacyController.declinePrivacy);

// get PrivacyPost by id
router.route("/findPrivacyById/:id").get(
  // Authentication.UserAuth,
  Controller.privacyController.getPrivacy
);

// get all  PrivacyPosts with details
router.route("/getAllPrivacies").get(
  //  Authentication.UserAuth,
  Controller.privacyController.getAllPrivacy
);

module.exports = router;
