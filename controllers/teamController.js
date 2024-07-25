const mongoose = require("mongoose");
const Model = require("../models/index");
const HTTPError = require("../utils/CustomError");
const Status = require("../status");
const catchAsync = require("../utils/catchAsync");
const cloudUpload = require("../cloudinary");
const cloudinary = require("cloudinary");

module.exports = {
  // Retrieve Team user by TeamId
  getTeam: catchAsync(async (req, res, next) => {
    console.log("findTeamById is called");
    try {
      var teamId = req.params.id;
      var result = await Model.Team.findById({_id:teamId});

      var message = "TeamId found successfully";
      if (result == null) {
        message = "TeamId does not exist.";
      }
      res.ok(message, result);
    } catch (error) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error);
    }
  }),

  createTeam: catchAsync(async (req, res, next) => {
    console.log("createTeam is called");
    try {
      var TeamData = req.body;
      // Upload primary image if provided
      if (req.files && req.files.profilePic) {
        const primaryImages = req.files.profilePic;
        const primaryImage = primaryImages[0];
        const { path } = primaryImage;
        const newPath = await cloudUpload.cloudinaryUpload(path);
        TeamData.profilePic = newPath;
      }
        
      const Team = new Model.Team(TeamData);
      await Team.save();
      var message = "Team created successfully";
      if (Team == null) {
        message = "Team does not exist.";
      }

      res.ok(message, Team);
    } catch (error) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error.message);
    }
  }),

  // Get all Team users with full details
  getAllTeam: catchAsync(async (req, res, next) => {
    console.log("Teamdetails is called");
    try {
      var message = "Teamdetails found successfully";
      var Teams = await Model.Team.find()
        .sort("-_id");
      const TeamSize = Teams.length;
      const result = {
        Team: Teams,
        count: TeamSize,
      };
      if (result == null) {
        message = "Teamdetails does not exist.";
      }
      var message = "Team  details find successfully";
      res.ok(message, result);
    } catch (error) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, error);
    }
  }),

  // Update a Team user
  updateTeam: catchAsync(async (req, res, next) => {
    try {
      // Get the Team data from the request body
      const { name, designation, twitter_url ,teamId} = req.body;
  
      // Initialize update object
      const updateObject = {};
  
      // Update title and description if provided
      if (name) updateObject["name"] = name;
      if (designation) updateObject["designation"] = designation;
      if (twitter_url) updateObject["twitter_url"] = twitter_url;
  
      // Upload primary image if provided
      if (req.files && req.files.profilePic) {
        const imageFile = req.files.profilePic[0];
        const { path } = imageFile;
        const newPath = await cloudUpload.cloudinaryUpload(path);
        updateObject["profilePic"] = newPath;
      }
  
      // Update the Team
      const result = await Model.Team.findOneAndUpdate(
        { _id: teamId },
        updateObject,
        { new: true }
      );
  
      if (!result) {
        throw new Error("Team not found");
      }
      const message = "Team status updated successfully";
      res.ok(message, result); // Sending the response with the updated result
    } catch (err) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, err.message);
    }
  }),  

  // Delete a Team user
  declineTeam: catchAsync(async (req, res, next) => {
    var TeamId = req.params.id;
    try {
      const TeamUser = await Model.Team.findById({_id:TeamId});
      if (!TeamUser)
        return res.badRequest("Team Not Found in our records");

      // Deleting primaryImage from Cloudinary
      if (TeamUser.profilePic) {
        const publicId = TeamUser.profilePic.split("/").pop();
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
      const deletedTeam = await Model.Team.findByIdAndDelete(TeamId);
          if (!deletedTeam)
              return res.badRequest("Team Not Found in our records");

          const message = "Team deleted successfully";
          res.ok(message,deletedTeam);
    } catch (err) {
      throw new HTTPError(Status.INTERNAL_SERVER_ERROR, err);
    }
  }),


};
