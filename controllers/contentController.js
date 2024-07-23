const mongoose = require("mongoose");
const Model = require("../models/index");
const HTTPError = require("../utils/CustomError");
const ContentHelper = require("../helper/content.helper");
const Status = require("../status");
const catchAsync = require("../utils/catchAsync");
const cloudUpload = require("../cloudinary");
const cloudinary = require("cloudinary");

module.exports = {
  // Retrieve Content user by ContentId
  getContent: catchAsync(async (req, res, next) => {
    console.log("findContentById is called");
    try {
      var ContentId = req.params.id;
      var result = await ContentHelper.findContentById(ContentId);

      var message = "ContentId found successfully";
      if (result == null) {
        message = "ContentId does not exist.";
      }
      res.ok(message, result);
    } catch (error) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error);
    }
  }),

  createContent: catchAsync(async (req, res, next) => {
    console.log("createContent is called");
    try {
      var contentData = req.body;
      console.log(contentData, "contentData");
      contentData.galleryImages = [];

      // Upload description images
      const imageFiles = req.files.galleryImages;

      // Check if the number of images exceeds the limit
      if (imageFiles && Array.isArray(imageFiles) && imageFiles.length > 2) {
        throw new Error("Exceeded maximum number of gallery images (2)");
      }

      // Process and upload gallery images
      if (imageFiles && Array.isArray(imageFiles)) {
        for (const imageFile of imageFiles) {
          const { path } = imageFile;
          const newPath = await cloudUpload.cloudinaryUpload(path);
          contentData.galleryImages.push(newPath);
        }
      }

      // Upload primary image if provided
      if (req.files && req.files.primaryImage) {
        const primaryImages = req.files.primaryImage;
        const primaryImage = primaryImages[0];
        const { path } = primaryImage;
        const newPath = await cloudUpload.cloudinaryUpload(path);
        contentData.primaryImage = newPath;
      }

      var result = await ContentHelper.createContent(contentData);

      var message = "Content created successfully";
      if (result == null) {
        message = "Content does not exist.";
      }

      res.ok(message, contentData);
    } catch (error) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error.message);
    }
  }),

  // Get all Content users with full details
  getAllContent: catchAsync(async (req, res, next) => {
    console.log("Contentdetails is called");
    try {
      var message = "Contentdetails found successfully";
      var Contents = await Model.Content.find()
        .populate({
          path: "categoryAndSubCategory.category",
          model: "Category",
          select: "_id categoryName",
        })
        .populate({
          path: "categoryAndSubCategory.subcategory",
          model: "Category",
          select: "_id categoryName",
        })
        .sort("-_id");
      const ContentSize = Contents.length;
      const result = {
        Content: Contents,
        count: ContentSize,
      };
      if (result == null) {
        message = "Contentdetails does not exist.";
      }
      var message = "Content  details find successfully";
      res.ok(message, result);
    } catch (error) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error);
    }
  }),

  // Update a Content user
  // Update a Content user
  updateContent: catchAsync(async (req, res, next) => {
    try {
      // Get the Content data from the request body
      const { title, description, contentId, video, galleryImageIndex } =
        req.body;

      // Initialize update object
      const updateObject = {};

      // Update title and description if provided
      if (title) updateObject["title"] = title;
      if (description) updateObject["description"] = description;
      if (video) updateObject["video"] = video;

      // Upload primary image if provided
      if (req.files && req.files.primaryImage) {
        const imageFile = req.files.primaryImage[0];
        const { path } = imageFile;
        const newPath = await cloudUpload.cloudinaryUpload(path);
        updateObject["primaryImage"] = newPath;
      }

      // Update a specific index of gallery images if index provided
      if (
        galleryImageIndex !== undefined &&
        galleryImageIndex !== null &&
        req.files &&
        req.files.galleryImages &&
        req.files.galleryImages.length > 0
      ) {
        const imageFile = req.files.galleryImages[0];
        const { path } = imageFile;
        const newPath = await cloudUpload.cloudinaryUpload(path);

        // Retrieve the existing galleryImages from the database
        const existingContent = await Model.Content.findById(contentId);
        if (!existingContent) {
          throw new Error("Content not found");
        }

        // Update the specific index of the galleryImages array
        if (
          existingContent.galleryImages &&
          existingContent.galleryImages.length > galleryImageIndex
        ) {
          // Clone the existing galleryImages array to avoid mutation
          const updatedGalleryImages = [...existingContent.galleryImages];
          // Update the specific index
          updatedGalleryImages[galleryImageIndex] = newPath;
          // Update the updateObject with the new galleryImages array
          updateObject["galleryImages"] = updatedGalleryImages;
          // Update the Content
          const result = await Model.Content.findOneAndUpdate(
            { _id: contentId },
            updateObject,
            { new: true }
          );

          if (!result) {
            throw new Error("Content not found");
          }
          const message = "Content status updated successfully";
          res.ok(message, result); // Sending the response with the updated result
        } else {
          throw new Error("Invalid gallery image index");
        }
      }

      // Update the Content
      const result = await Model.Content.findOneAndUpdate(
        { _id: contentId },
        updateObject,
        { new: true }
      );

      if (!result) {
        throw new Error("Content not found");
      }
      const message = "Content status updated successfully";
      res.ok(message, result); // Sending the response with the updated result
    } catch (err) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, err.message);
    }
  }),

  // Delete a Content user
  declineContent: catchAsync(async (req, res, next) => {
    var ContentId = req.params.id;
    try {
      const ContentUser = await Model.Content.findOneAndDelete(ContentId);
      if (!ContentUser)
        return res.badRequest("Content Not Found in our records");

      // Deleting primaryImage from Cloudinary
      if (ContentUser.primaryImage) {
        const publicId = ContentUser.primaryImage.split("/").pop();
        await cloudinary.uploader.destroy(publicId, (error, result) => {
          if (error) {
            console.error(
              "Error deleting primaryImage from Cloudinary:",
              error
            );
            // Handle the error if needed
          } else {
            console.log("primaryImage deleted from Cloudinary:", result);
          }
        });
      }

      // Deleting the first two images from galleryImages array from Cloudinary
      if (ContentUser.galleryImages && ContentUser.galleryImages.length >= 2) {
        const imagesToDelete = ContentUser.galleryImages.slice(0, 2);
        for (const imageUrl of imagesToDelete) {
          const publicId = imageUrl.split("/").pop();
          await cloudinary.uploader.destroy(publicId, (error, result) => {
            if (error) {
              console.error("Error deleting image from Cloudinary:", error);
              // Handle the error if needed
            } else {
              console.log("Image deleted from Cloudinary:", result);
            }
          });
        }
      }

      // Remove content from database
      var message = "Content user deleted successfully";
      res.ok(message);
    } catch (err) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, err);
    }
  }),

  getAllCategoryContent: catchAsync(async (req, res, next) => {
    console.log("getAllCategoryContent is called");
    try {
      const pageNumber = parseInt(req.query.pageNumber) || 0;
      const limit = parseInt(req.query.limit) || 10;

      // Check if pagination parameters are provided
      if (pageNumber === 0 && limit === 10) {
        // If not provided, fetch the latest 5 content posts
        const latestContents = await Model.Content.find().limit(5).sort("-_id");

        const latestContentSize = latestContents.length;
        const latestResult = {
          Content: latestContents,
          count: latestContentSize,
          limit: 5, // Assuming you want to limit to 5 posts
        };

        // Return the latest 5 content posts
        return res.ok(
          "Latest 5 content posts found successfully",
          latestResult
        );
      }
      if (req.query.categoryId) {
        const categoryId = req.query.categoryId;
        console.log(categoryId, "categoryId");

        try {
          const contents = await Model.Content.find({
            $or: [
              { "categoryAndSubCategory.category": categoryId },
              { "categoryAndSubCategory.subcategory": categoryId },
            ],
          })
            .skip(pageNumber * limit - limit)
            .limit(limit)
            .sort("-_id");

          const contentSize = contents.length;
          const result = {
            Content: contents,
            count: contentSize,
            limit: limit,
          };

          if (contentSize === 0) {
            return res.notFound("No content found for the provided category.");
          }

          return res.ok("Content details found successfully", result);
        } catch (error) {
          throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error);
        }
      }

      // If pagination parameters are provided, proceed with normal pagination logic
      const Contents = await Model.Content.find()
        .skip(pageNumber * limit - limit)
        .limit(limit)
        .sort("-_id");

      const contentSize = Contents.length;
      const result = {
        Content: Contents,
        count: contentSize,
        limit: limit,
      };

      if (contentSize === 0) {
        return res.notFound("Content details do not exist.");
      }

      return res.ok("Content details found successfully", result);
    } catch (error) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error);
    }
  }),

  getHomeContent: catchAsync(async (req, res, next) => {
    console.log("findContentById is called");
    try {
      // Specify the category IDs you want to exclude
      const excludedCategoryIds = [
        "6628fa73e1aba3d45b379734",
        "6628fa7ce1aba3d45b379737",
      ];

      const latestContents = await Model.Content.find({
        "categoryAndSubCategory.category": { $nin: excludedCategoryIds },
      })
        .populate({
          path: "categoryAndSubCategory.category",
          model: "Category",
          select: "_id categoryName",
        })
        .populate({
          path: "categoryAndSubCategory.subcategory",
          model: "Category",
          select: "_id categoryName",
        })
        .limit(5)
        .sort("-_id");
      const includedCategoryIIds = ["6628fa7ce1aba3d45b379737"];
      const latestPodCasts = await Model.Content.find({
        "categoryAndSubCategory.category": { $in: includedCategoryIIds },
      })
        .populate({
          path: "categoryAndSubCategory.category",
          model: "Category",
          select: "_id categoryName",
        })
        .populate({
          path: "categoryAndSubCategory.subcategory",
          model: "Category",
          select: "_id categoryName",
        })
        .limit(3)
        .sort("-_id");

      // const latestContentSize = latestContents.length;
      const responseResult = {
        fiveLatestContents: latestContents,
        podCasts: latestPodCasts,
      };

      // Return the latest 5 content posts
      return res.ok(" posts found successfully", responseResult);
    } catch (error) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error);
    }
  }),
};
