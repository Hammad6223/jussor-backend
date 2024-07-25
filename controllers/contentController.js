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
          path: "category",
          model: "Category",
          select: "_id categoryName",
        })
        .populate({
          path: "subcategory",
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
      const {
        title,
        description,
        contentId,
        video,
        galleryImageIndex,
        category,
        subcategory,
      } = req.body;

      // Initialize update object
      const updateObject = {};

      // Update title and description if provided
      if (title) updateObject["title"] = title;
      if (description) updateObject["description"] = description;
      if (video) updateObject["video"] = video;
      if (category) updateObject["category"] = category;
      if (subcategory) updateObject["subcategory"] = subcategory;

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
    var ContentId = req.params.categoryId;
    try {
        // Find content by ID
        const ContentUser = await Model.Content.findById({_id:ContentId});
        // Check if content exists
        if (!ContentUser) {
            return res.badRequest("Content with the provided ID not found in our records");
        }

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

        // Delete content from the database
        await Model.Content.findByIdAndDelete({_id:ContentId});

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
      // Find the category ID for "جسور TV"
      const jusoorTvCategory = await Model.Category.findOne({
        categoryName: "جسور TV",
      });

      if (!jusoorTvCategory) {
        return res.notFound("Category 'جسور TV' not found.");
      }

      // Fetch latest contents excluding "جسور TV" category
      const latestContents = await Model.Content.find({
        category: { $ne: jusoorTvCategory._id },
      })
        .populate({
          path: "category",
          model: "Category",
          select: "_id categoryName",
        })
        .populate({
          path: "subcategory",
          model: "Category",
          select: "_id categoryName",
        })
        .limit(5)
        .sort("-_id");
      const latestJusoorContents = await Model.Content.find({
        category: { $eq: jusoorTvCategory._id },
      })

        .populate({
          path: "category",
          model: "Category",
          select: "_id categoryName",
        })
        .populate({
          path: "subcategory",
          model: "Category",
          select: "_id categoryName",
        })
        .limit(2)
        .sort("-_id");
      const latestWeeklyJusoorContents = await Model.Content.find({
        category: { $eq: jusoorTvCategory._id },
      })

        .populate({
          path: "category",
          model: "Category",
          select: "_id categoryName",
        })
        .populate({
          path: "subcategory",
          model: "Category",
          select: "_id categoryName",
        })
        .limit(3)
        .sort("-_id");
      const latestMonthlyJusoorContents = await Model.Content.find({
        category: { $eq: jusoorTvCategory._id },
      })

        .populate({
          path: "category",
          model: "Category",
          select: "_id categoryName",
        })
        .populate({
          path: "subcategory",
          model: "Category",
          select: "_id categoryName",
        })
        .limit(3)
        .sort("-_id");

      const responseResult = {
        Main: latestContents,
        JusoorTv: latestJusoorContents,
        WeeklyPosts: latestWeeklyJusoorContents,
        MonthlyPosts: latestMonthlyJusoorContents,
      };

      return res.ok("Posts found successfully", responseResult);
    } catch (error) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error);
    }
  }),
  getAllCategoryContents: catchAsync(async (req, res, next) => {
    console.log("getAllCategoryContent is called");
    try {
      // const pageNumber = parseInt(req.query.pageNumber) || 0;
      // const limit = parseInt(req.query.limit) || 10;

      let query = {};

      if (req.params.categoryId) {
        const categoryId = req.params.categoryId;

        query = {
          $or: [{ category: categoryId }, { subcategory: categoryId }],
        };
      }

      const contents = await Model.Content.find(query)
        // .skip(pageNumber * limit - limit)
        // .limit(limit)
        .sort("-_id");

      const contentSize = contents.length;
      const result = {
        Content: contents,
        count: contentSize,
      };

      if (contentSize === 0) {
        if (req.params.categoryId) {
          return res.notFound("No content found for the provided category.");
        } else {
          return res.notFound("No content found.");
        }
      }

      return res.ok("Content details found successfully", result);
    } catch (error) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error);
    }
  }),
};
