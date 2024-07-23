const cloudinary = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  // api_secret: "q-8zGLwVZflGiBnTmbh-MXeqTXo",
  api_secret: process.env.API_SECRET,
});
module.exports = {
  cloudinaryUpload: async (file) => {
    const result = await cloudinary.v2.uploader.upload(file, {
      resource_type: "auto",
      folder:"jusoor"
    });
    // console.log(result, 'result')
    return result.public_id;
  },

  // })
};
