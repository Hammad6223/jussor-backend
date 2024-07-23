const mongoose = require("mongoose");
const Model = require("../models/index");
const HTTPError = require("../utils/CustomError");
const BannerHelper = require("../helper/banner.helper");
const Status = require("../status");
const catchAsync = require("../utils/catchAsync");
const cloudUpload = require("../cloudinary");
const cloudinary = require("cloudinary");
module.exports = {
  // Retrieve Banner user by bannerId
  getBanner: catchAsync(async (req, res, next) => {
    console.log("findBannerById is called");
    try {
      var bannerId = req.params.id;
      var result = await BannerHelper.findBannerById(bannerId);

      var message = "bannerId found successfully";
      if (result == null) {
        message = "bannerId does not exist.";
      }
      res.ok(message, result);
    } catch (error) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error);
    }
  }),

  createBanner: catchAsync(async (req, res, next) => {
    console.log("createBanner is called", req.file);
    try {
        const bannerData = req.body;

        // Check if the number of existing image banners is less than 3
        const imageBannersCount = await Model.Banner.countDocuments({
            image: { $exists: true }
        });
        if (req.files && req.files.image && imageBannersCount + req.files.image.length > 3) {
            throw new Error("Cannot create more than 3 image banners.");
        }

        // Check if the number of existing video banners is less than 1
        const videoBannersCount = await Model.Banner.countDocuments({
            video: { $exists: true }
        });
        if (req.files && req.files.video && videoBannersCount + req.files.video.length > 1) {
            throw new Error("Cannot create more than 1 video banner.");
        }

        // Upload image if available
        if (req.files && req.files.image) {
            const image = req.files.image[0];
            console.log(image);
            const imagePath = image.path; // Get the file path
            const imageUrl = await cloudUpload.cloudinaryUpload(imagePath);
            bannerData.image = imageUrl;
        }

        // Upload video if available
        if (req.files && req.files.video) {
            const video = req.files.video[0];
            const videoPath = video.path; // Get the file path
            const videoUrl = await cloudUpload.cloudinaryUpload(videoPath);
            bannerData.video = videoUrl;
        }

        // Check again if uploading the banner exceeded the limits
        const updatedImageBannersCount = await Model.Banner.countDocuments({
            image: { $exists: true }
        });
        const updatedVideoBannersCount = await Model.Banner.countDocuments({
            video: { $exists: true }
        });

        if (updatedImageBannersCount > 3) {
            throw new Error("Cannot create more than 3 image banners.");
        }
        if (updatedVideoBannersCount > 1) {
            throw new Error("Cannot create more than 1 video banner.");
        }

        // Create the new banner
        const result = await BannerHelper.createBanner(bannerData);
        if (!result) {
            throw new Error("Banner does not exist.");
        }

        const message = "Banner created successfully";
        res.ok(message, bannerData); // Return the created banner data
    } catch (error) {
        throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error.message);
    }
}),

  // Get all Banner users with full details
  getAllBanner: catchAsync(async (req, res, next) => {
    console.log("Bannerdetails is called");
    try {
      var message = "Banner details found successfully";
      // Await the result of the Mongoose query
      var Banners = await Model.Banner.find().sort("-_id");
      const BannerSize = Banners.length;
      const result = {
        Banners: Banners,
        count: BannerSize,
      };
      if (BannerSize === 0) {
        // Check the length of Banners array
        message = "Banner details do not exist.";
      }
      res.ok(message, result);
    } catch (error) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error);
    }
  }),

  // Update a Banner user
  updateBanner: catchAsync(async (req, res, next) => {
    try {
      // Get the Banner data from the request body
      const { title, description, bannerId } = req.body;

      // Initialize update object
      const updateObject = {};

      // Update title and description if provided
      if (title) updateObject["title"] = title;
      if (description) updateObject["description"] = description;

      // Upload image if provided
      if (req.files && req.files.image && req.files.image.length > 0) {
        const imageFile = req.files.image[0];
        const { path } = imageFile;
        const newPath = await cloudUpload.cloudinaryUpload(path);
        // Since the schema expects an array of image URLs, we need to push the new URL
        updateObject["image"] = newPath;
      }
      if (req.files && req.files.video && req.files.video.length > 0) {
        const imageFile = req.video.image[0];
        const { path } = imageFile;
        const newPath = await cloudUpload.cloudinaryUpload(path);
        // Since the schema expects an array of image URLs, we need to push the new URL
        updateObject["video"] = newPath;
      }
      // Update the Banner
      const result = await Model.Banner.findOneAndUpdate(
        { _id: bannerId },
        updateObject,
        { new: true }
      );

      if (!result) {
        throw new Error("Banner not found");
      }

      const message = "Banner status updated successfully";
      res.ok(message, result);
    } catch (err) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, err.message);
    }
  }),

  // Delete a Banner user
    declineBanner: catchAsync(async (req, res, next) => {
      const bannerId = req.params.id;
      try {
          // Find the banner by ID
          const banner = await Model.Banner.findById(bannerId);
          if (!banner)
              return res.badRequest("Banner Not Found in our records");

          // Check if there's an image and/or video associated with the banner
          if (banner.image) {
              const publicId = banner.image.split('/').pop()
              console.log(publicId, "publicId");
              // Delete the image file from Cloudinary
              await cloudinary.uploader.destroy(publicId, (error, result) => {
                  if (error) {
                      console.error("Error deleting image from Cloudinary:", error);
                      // Handle the error if needed
                  } else {
                      console.log("Image deleted from Cloudinary:", result);
                  }
              });
          }
          if (banner.video) {
              const publicId = banner.video.split('/').pop()
              console.log(publicId, "publicId");
              // Delete the video file from Cloudinary
              await cloudinary.uploader.destroy(publicId, (error, result) => {
                  if (error) {
                      console.error("Error deleting video from Cloudinary:", error);
                      // Handle the error if needed
                  } else {
                      console.log("Video deleted from Cloudinary:", result);
                  }
              });
          }

          // Delete the banner from the database
          const deletedBanner = await Model.Banner.findByIdAndDelete(bannerId);
          if (!deletedBanner)
              return res.badRequest("Banner Not Found in our records");

          const message = "Banner deleted successfully";
          res.ok(message,deletedBanner);
      } catch (err) {
          throw new HTTPError(Status.INTERNAL_SERVER_ERROR, err.message);
      }
  }),

};
