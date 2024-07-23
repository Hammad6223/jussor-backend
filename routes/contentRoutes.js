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

const videoFileFilter = function (req, file, callback) {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedVideoTypes = [".mp4", ".avi", ".mov"];
  if (allowedVideoTypes.includes(ext)) {
    callback(null, true);
  } else {
    callback(new Error("Only videos are allowed"));
  }
};

const upload = multer({
  storage: userStorage,
  fileFilter: function (req, file, callback) {
    if (file.fieldname === "primaryImage") {
      imageFileFilter(req, file, callback);
    } else if (file.fieldname === "galleryImages") {
      imageFileFilter(req, file, callback);
    } else if (file.fieldname === "video") {
      videoFileFilter(req, file, callback);
    } else {
      callback(new Error("Invalid fieldname"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

//post custom ContentPost
router.route("/createContentPost").post(
  upload.fields([
    {
      name: "galleryImages",
      maxCount: 3
    },
    {
      name: "video",
      maxCount: 1,
    },
    {
      name: "primaryImage",
      maxCount: 1,
    },
  ]),
  Authentication.UserAuth,
  Controller.contentController.createContent
);

//update ContentPost
router.route("/updateContentPost").put(
  Authentication.UserAuth,
  upload.fields([
    {
      name: "galleryImages",
      maxCount: 2,
    },
    {
      name: "video",
      maxCount: 1,
    },
    {
      name: "primaryImage",
      maxCount: 1,
    },
  ]),
  Controller.contentController.updateContent
);

//delete ContentPost
router
  .route("/deleteContentPost/:id")
  .delete(
    //  Authentication.UserAuth,
     Controller.contentController.declineContent);

// get ContentPost by id
router.route("/findContentPostById/:id").get(
  // Authentication.UserAuth,
  Controller.contentController.getContent
);

// get all  ContentPosts with details
router.route("/getAllContentPosts").get(
  // Authentication.UserAuth,
  Controller.contentController.getAllContent
);

router.route("/getAllCategoryContent").get(
  // Authentication.UserAuth,
  Controller.contentController.getAllCategoryContent
);

router.route("/getHomeContent").get(
  // Authentication.UserAuth,
  Controller.contentController.getHomeContent
);

module.exports = router;
