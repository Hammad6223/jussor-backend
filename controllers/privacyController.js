const mongoose = require("mongoose");
const Model = require("../models/index");
const HTTPError = require("../utils/CustomError");
const Status = require("../status");
const catchAsync = require("../utils/catchAsync");
const cloudUpload = require("../cloudinary");
const cloudinary = require("cloudinary");

module.exports = {
  // Retrieve Privacy user by privacyId
  getPrivacy: catchAsync(async (req, res, next) => {
    console.log("findPrivacyById is called");
    try {
      var privacyId = req.params.id;
      var result = await Model.Privacy.findById({_id:privacyId});

      var message = "privacyId found successfully";
      if (result == null) {
        message = "privacyId does not exist.";
      }
      res.ok(message, result);
    } catch (error) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error);
    }
  }),

  createPrivacy: catchAsync(async (req, res, next) => {
    console.log("createPrivacy is called");
    try {
      var PrivacyData = req.body;
      // Upload primary image if provided
      if (req.files && req.files.image) {
        const primaryImages = req.files.image;
        const primaryImage = primaryImages[0];
        const { path } = primaryImage;
        const newPath = await cloudUpload.cloudinaryUpload(path);
        PrivacyData.image = newPath;
      }
        
      const Privacy = new Model.Privacy(PrivacyData);
      await Privacy.save();
      var message = "Privacy created successfully";
      if (Privacy == null) {
        message = "Privacy does not exist.";
      }

      res.ok(message, Privacy);
    } catch (error) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error.message);
    }
  }),

  // Get all Privacy users with full details
  getAllPrivacy: catchAsync(async (req, res, next) => {
    console.log("Privacydetails is called");
    try {
      var message = "Privacydetails found successfully";
      var Privacys = await Model.Privacy.find()
        .sort("-_id");
      const PrivacySize = Privacys.length;
      const result = {
        Privacy: Privacys,
        count: PrivacySize,
      };
      if (result == null) {
        message = "Privacydetails does not exist.";
      }
      var message = "Privacy  details find successfully";
      res.ok(message, result);
    } catch (error) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error);
    }
  }),

  // Update a Privacy user
  updatePrivacy: catchAsync(async (req, res, next) => {
    try {
      // Get the Privacy data from the request body
      const { title, description,privacyId} = req.body;
  
      // Initialize update object
      const updateObject = {};
  
      // Update title and description if provided
      if (title) updateObject["title"] = title;
      if (description) updateObject["description"] = description;
  
      // Upload primary image if provided
      if (req.files && req.files.image) {
        const imageFile = req.files.image[0];
        const { path } = imageFile;
        const newPath = await cloudUpload.cloudinaryUpload(path);
        updateObject["image"] = newPath;
      }
  
      // Update the Privacy
      const result = await Model.Privacy.findOneAndUpdate(
        { _id: privacyId },
        updateObject,
        { new: true }
      );
  
      if (!result) {
        throw new Error("Privacy not found");
      }
      const message = "Privacy status updated successfully";
      res.ok(message, result); // Sending the response with the updated result
    } catch (err) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, err.message);
    }
  }),  

  // Delete a Privacy user
  declinePrivacy: catchAsync(async (req, res, next) => {
    var privacyId = req.params.id;
    try {
      const PrivacyUser = await Model.Privacy.findByIdAndDelete({_id:privacyId});
      if (!PrivacyUser)
        return res.badRequest("Privacy Not Found in our records");

      // Deleting primaryImage from Cloudinary
      if (PrivacyUser.image) {
        const publicId = PrivacyUser.image.split("/").pop();
        await cloudinary.uploader.destroy(publicId, (error, result) => {
          if (error) {
            console.error(
              "Error deleting profilePic from Cloudinary:",
              error
            );
            // Handle the error if needed
          } else {
            console.log("profilePic deleted from Cloudinary:", result);
          }
        });
      }
      // Remove Privacy from database
      var message = "Privacy user deleted successfully";
      res.ok(message);
    } catch (err) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, err);
    }
  }),


};
