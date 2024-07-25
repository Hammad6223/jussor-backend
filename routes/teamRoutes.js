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
    if (file.fieldname === "profilePic") {
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

//post custom TeamPost
router.route("/createTeam").post(
  upload.fields([
    {
      name: "profilePic",
      maxCount: 1,
    },
  ]),
  Authentication.UserAuth,
  Controller.teamController.createTeam
);

//update TeamPost
router.route("/updateTeam").put(
  Authentication.UserAuth,
  upload.fields([
    {
      name: "profilePic",
      maxCount: 1,
    },
  ]),
  Controller.teamController.updateTeam
);

//delete TeamPost
router
  .route("/deleteTeam/:id")
  .delete(
    Authentication.UserAuth, 
    Controller.teamController.declineTeam);

// get TeamPost by id
router.route("/findTeamById/:id").get(
  // Authentication.UserAuth,
  Controller.teamController.getTeam
);

// get all  TeamPosts with details
router.route("/getAllTeams").get(
  //  Authentication.UserAuth,
  Controller.teamController.getAllTeam
);

module.exports = router;
