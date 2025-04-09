const mongoose = require("mongoose");
const Job = require("./Model/Jobs"); // Ensure this path is correct
const JobData = require("./Data/JobsDataAvl"); // Import the job data
const InternshipData = require("./Data/InternshipDatAvl"); // Import the internship data
const Internship = require("./Model/Internship");
// const url = process.env.DATABASEURL;
const url =
  "mongodb+srv://internDB:mongoAniketInternArea@cluster0.sxodt.mongodb.net/intern_admin?retryWrites=true&w=majority&appName=Cluster0";

// MongoDB Connection
mongoose
  .connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("MongoDB Connected");

    // Insert data into MongoDB
    await db.jobs.updateMany(
      { company: "myORG Ltd." }, // Find documents where the company is "myORG Ltd."
      { $set: { company: "AniketORG Ltd." } } // Update the company field to "AniketORG Ltd."
    );

    // await Job.insertMany(JobData);
    // await Internship.insertMany(InternshipData);
    console.log("Job data seeded successfully");

    // Close connection
    mongoose.connection.close();
  })
  .catch((err) => {
    console.log(url);
    console.error("Error connecting to MongoDB:", err);
  });
