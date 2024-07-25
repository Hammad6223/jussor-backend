const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const PrivacyPolicyModel = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

PrivacyPolicyModel.set("toJSON", {
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    delete ret.password;
  },
});

const PrivacyPolicy = mongoose.model("PrivacyPolicy", PrivacyPolicyModel);
module.exports = PrivacyPolicy;
