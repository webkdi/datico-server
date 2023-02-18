const express = require("express");
const img = require("../components/Images");
const router = express.Router();

router.get("/", async (req, res) => {
  const list = await img.getListOfImages();
  res.send(list);
});

router.post("/optimize", async (req, res) => {
  if (JSON.stringify(req.body) !== "{}") {
    const path = req.body.path;
    if (path.includes("freud.online/")) {
      const respond = await img.optimizeImage(path);
      res.send("done");
    }
  } else {
    console.log(Date().toString(), "get / no data received");
  }
  // const respond = await img.optimizeImage(req);
  res.send("no data");
});

module.exports = router;
