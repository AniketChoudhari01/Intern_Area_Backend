const express = require("express");
const router = express.Router();
const internship = require("../Model/Internship");

router.post("/", async (req, res) => {
  try {
    const internshipData = new internship({
      title: req.body.title,
      company: req.body.company,
      location: req.body.location,
      Duration: req.body.Duration,
      category: req.body.category,
      aboutCompany: req.body.aboutCompany,
      aboutInternship: req.body.aboutInternship,
      Whocanapply: req.body.Whocanapply,
      perks: req.body.perks,
      AdditionalInfo: req.body.AdditionalInfo,
      stipend: req.body.stipend,
      StartDate: req.body.StartDate,
    });
    await internshipData.save();
    res.status(201).json(internshipData);
  } catch (error) {
    // console.error(error);
    res.status(500).json({ error: "Failed to create internship entry" });
  }
});

router.get("/", async (req, res) => {
  try {
    const data = await internship.find();
    res.json(data).status(200);
  } catch (error) {
    // console.log(err);
    res.status(404).json({ error: "Internal server error " });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const data = await internship.findById(id);
    if (!data) {
      res.status(404).json({ error: "Internship is not found " });
    }
    res.json(data).status(200);
  } catch (error) {
    // console.log(err);
    res.status(404).json({ error: "Internal server error " });
  }
});
module.exports = router;
