const express = require("express");
const router = express.Router();
const Job = require("../Model/Jobs");

// POST route to create a new job entry
router.post("/", async (req, res) => {
  try {
    const JobData = new Job({
      title: req.body.title,
      company: req.body.company,
      location: req.body.location,
      Experience: req.body.experience,
      category: req.body.category,
      aboutCompany: req.body.aboutCompany,
      aboutInternship: req.body.aboutInternship,
      Whocanapply: req.body.Whocanapply,
      perks: req.body.perks,
      AdditionalInfo: req.body.AdditionalInfo,
      CTC: req.body.ctc,
      StartDate: req.body.StartDate,
    });

    await JobData.save(); // Save the job data to MongoDB
    res.status(201).json(JobData); // Respond with the created data
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create job entry" });
  }
});

// GET route to retrieve all job entries
router.get("/", async (req, res) => {
  try {
    const data = await Job.find(); // Fetch all jobs from the DB
    res.status(200).json(data); // Send job data as JSON
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET route to retrieve a single job entry by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const data = await Job.findById(id); // Fetch job by ID
    if (!data) {
      return res.status(404).json({ error: "Job not found" });
    }
    res.status(200).json(data); // Send the job data as JSON
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
