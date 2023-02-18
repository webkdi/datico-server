const express = require("express");
const img = require("../components/Images");
const router = express.Router();

router.get("/", async (req, res) => {
  const list = await img.getListOfImages();
  res.send(list);
});

module.exports = router;
