const express = require("express");
const img = require("../components/ImagesFunctions");
const db = require("./Database");
const router = express.Router();

router.get("/update_list", async (req, res) => {
  const list = await img.searchForImageFilesExecute();
  res.send(list);
});

router.post("/optimize", async (req, res) => {
  if (JSON.stringify(req.body) !== "{}") {
    const path = req.body.path;
    if (path.includes("freud.online/")) {
      const respond = await img.optimizeImage(path);
      res.send(respond);
    }
  } else {
    console.log(Date().toString(), "get / no data received");
  }
  // const respond = await img.optimizeImage(req);
  // res.send("no data");
});

router.get("/get_list", async (req, res) => {
  const quote = await img.getListOfImages();
  res.send(quote);
});

//only for locale Arbeiten! Remove 
// router.get("/do_job", async (req, res) => {
//   const quote = await img.getListOfImages();
//   res.send(quote);
// });


module.exports = router;
