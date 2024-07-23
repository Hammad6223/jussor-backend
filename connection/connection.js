const mongoose = require("mongoose");
module.exports = {
  connect: (cb) => {
    // const devUrl = `mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@localhost:27017/findlarry`;
    // const devUrl = `mongodb+srv://hammadakram6223:jgV3jy9qypzezaO1@cluster0.ungqcbm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
    // const prodUrl = "";
    mongoose.connect(process.env.BASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = mongoose.connection;
    db.on("error", () => {
      console.error.bind(console, "MongoDb connection error.");
      return cb(false);
    });
    console.log("Connected!");
    return cb(true);
  },
  
};
