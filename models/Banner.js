const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BannerModel = new Schema(
  {
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    image: 
      {
        type: String,
      },
    video: 
      {
        type: String,
      },
      post_id: {
        type: Schema.Types.ObjectId,
        ref: 'ContentPost',
      },
  },
  {
    timestamps: true,
    strict: true,
  }
);

BannerModel.set("toJSON", {
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
  },
});

const Banner = mongoose.model("Banner", BannerModel);
module.exports = Banner;
