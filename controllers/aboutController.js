const mongoose = require("mongoose");
const Model = require("../models/index");
const HTTPError = require("../utils/CustomError");
const Status = require("../status");
const catchAsync = require("../utils/catchAsync");
const cloudUpload = require("../cloudinary");
const cloudinary = require("cloudinary");

module.exports = {
  // Retrieve About user by AboutId
  getAbout: catchAsync(async (req, res, next) => {
    console.log("findAboutById is called");
    try {
      var AboutId = req.params.id;
      var result = await Model.About.findById({_id:AboutId});

      var message = "AboutId found successfully";
      if (result == null) {
        message = "AboutId does not exist.";
      }
      res.ok(message, result);
    } catch (error) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error);
    }
  }),

  createAbout: catchAsync(async (req, res, next) => {
    console.log("createAbout is called");
    try {
      var AboutData = req.body;
      // Upload primary image if provided
      if (req.files && req.files.image) {
        const primaryImages = req.files.image;
        const primaryImage = primaryImages[0];
        const { path } = primaryImage;
        const newPath = await cloudUpload.cloudinaryUpload(path);
        AboutData.image = newPath;
      }
        
      const About = new Model.About(AboutData);
      await About.save();
      var message = "About created successfully";
      if (About == null) {
        message = "About does not exist.";
      }

      res.ok(message, About);
    } catch (error) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error.message);
    }
  }),

  // Get all About users with full details
  getAllAbout: catchAsync(async (req, res, next) => {
    console.log("Aboutdetails is called");
    try {
      var message = "Aboutdetails found successfully";
      var Abouts = await Model.About.find()
        .sort("-_id");
      const AboutSize = Abouts.length;
      const result = {
        About: Abouts,
        count: AboutSize,
      };
      if (result == null) {
        message = "Aboutdetails does not exist.";
      }
      var message = "About  details find successfully";
      res.ok(message, result);
    } catch (error) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error);
    }
  }),

  // Update a About user
  updateAbout: catchAsync(async (req, res, next) => {
    try {
      // Get the About data from the request body
      const { title, description,aboutId} = req.body;
  
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
  
      // Update the About
      const result = await Model.About.findOneAndUpdate(
        { _id: aboutId },
        updateObject,
        { new: true }
      );
  
      if (!result) {
        throw new Error("About not found");
      }
      const message = "About status updated successfully";
      res.ok(message, result); // Sending the response with the updated result
    } catch (err) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, err.message);
    }
  }),  

  // Delete a About user
  declineAbout: catchAsync(async (req, res, next) => {
    var AboutId = req.params.id;
    try {
      const AboutUser = await Model.About.findByIdAndDelete({_id:AboutId});
      if (!AboutUser)
        return res.badRequest("About Not Found in our records");

      // Deleting primaryImage from Cloudinary
      if (AboutUser.image) {
        const publicId = AboutUser.image.split("/").pop();
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
      // Remove About from database
      var message = "About user deleted successfully";
      res.ok(message);
    } catch (err) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, err);
    }
  }),


};
