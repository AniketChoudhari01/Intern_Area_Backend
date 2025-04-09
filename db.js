const mongoose  = require("mongoose");
const url = process.env.DATABASEURL;
// const url = "mongodb://127.0.0.1:27017/intern_admin";

const connectDB = async () => {
  try {
    await mongoose.connect(url);
    // console.log(url)
    console.log("Database is connected");
    
  } catch (error) {
    console.log("DB connection failed Error:", error.message);
    console.error("Full error:", error);
  }
};
module.exports = connectDB;
