const express = require("express");
const Controller = require("../../controllers/index");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const Authentication = require("../../services/index");

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
    } else {
      callback(new Error("Invalid fieldname"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});
router.route("/register").post(Controller.UserAuthController.registerUser);
router
  .route("/userAccontVerification")
  .post(Controller.UserAuthController.accountVerificationUser);
router.route("/login").post(Controller.UserAuthController.loginUser);
router
  .route("/forgetPassword")
  .post(Controller.UserAuthController.forgetUserPassword);
router
  .route("/getSingleUser")
  .get(Authentication.UserAuth, Controller.UserAuthController.getSingleUser);

router.route("/getAllCustomers").get(Controller.UserAuthController.getAllUsers);
router
  .route("/changePassword")
  .post(
    Authentication.UserAuth,
    Controller.UserAuthController.changeUserPassword
  );
router.route("/resendOtp").post(Controller.UserAuthController.resendUserOtp);
router
  .route("/userChangepassword")
  .post(Controller.UserAuthController.changeUserPassword);

router
  .route("/deleteSingleUser/:id")
  .delete(Controller.UserAuthController.deleteUser);

router.route("/uploadAdminProfile").post(
  Authentication.UserAuth,
  upload.fields([
    {
      name: "profilePic",
      maxCount: 1,
    },
  ]),
  Controller.UserAuthController.uploadUserProfilePic
);

module.exports = router;
