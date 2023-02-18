const express = require("express");
const img = require("../components/Images");
const router = express.Router();

router.get("/", async (req, res) => {
  const list = await img.getListOfImages();
  res.send(list);
});

router.post("/optimize", async (req, res) => {
  const respond = await img.optimizeImage(req);
  res.send(respond);
});

module.exports = router;
