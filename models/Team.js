const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const TeamModel = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    designation: {
      type: String,
      required: true,
    },
    profilePic: {
      type: String,
      required: true,
    },
    twitter_url: {
      type: String,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

TeamModel.set("toJSON", {
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    delete ret.password;
  },
});

const Team = mongoose.model("Team", TeamModel);
module.exports = Team;
