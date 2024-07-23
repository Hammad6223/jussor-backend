const mongoose = require("mongoose");
module.exports = {
  connect: (cb) => {

    mongoose.connect(process.env.BASE_URL);
    const db = mongoose.connection;
    db.on("error", () => {
      console.error.bind(console, "MongoDb connection error.");
      return cb(false);
    });
    console.log("Connected!");
    return cb(true);
  },
  
};
