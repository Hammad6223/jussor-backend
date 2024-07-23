const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const categorySchema = new Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  },
});
const ContentPostSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    galleryImages: [
      {
        type: String,
      },
    ],
    video: {
      type: String,
    },
    primaryImage: {
      type: String,
    },

    categoryAndSubCategory: categorySchema,
  },
  {
    timestamps: true,
    strict: true,
  }
);

ContentPostSchema.set("toJSON", {
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
  },
});

const ContentPost = mongoose.model("ContentPost", ContentPostSchema);
module.exports = ContentPost;
