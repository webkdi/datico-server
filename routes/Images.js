require("dotenv").config();
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
    const password = req.body.password;

    if (!path) {
      res.send("no 'path' to file");
    } else if (!password) {
      res.send("'password' missing!");
    } else if (password !== process.env.PRIVATE_APP_PASSWORD) {
      res.send("'password' is wrong!");
    } else if (!path.includes("freud.online/")) {
      res.send("'path' is strange");
    } else {
      // perform optimization and send response

      img
        .optimizeImage(path, password)
        .then((info) => {
          console.log("OK:", info);
          res.send(info);
        })
        .catch((err) => {
          console.error("Error:", err);
          res.status(500).send({ message: err.message, stack: err.stack });
        });
    }
  } else {
    res.send(Date().toString() + " no data received");
  }
});

router.post("/delete", async (req, res) => {
  if (JSON.stringify(req.body) !== "{}") {
    const path = req.body.path;
    const password = req.body.password;

    if (!path) {
      res.send("no 'path' to file");
    } else if (!password) {
      res.send("'password' missing!");
    } else if (password !== process.env.PRIVATE_APP_PASSWORD) {
      res.send("'password' is wrong!");
    } else if (!path.includes("freud.online/")) {
      res.send("'path' is strange");
    } else {
      // perform optimization and send response

      img
        .deleteFile(path, password)
        .then(() => {
          console.log("File deleted successfully!");
          res.send("File deleted successfully!");
        })
        .catch((err) => {
          console.error(`Error in deleting file: ${err}`);
          res.status(500).send(`Error in deleting file: ${err}`);
        });
    }
  } else {
    res.send(Date().toString() + " no data received");
  }
});

router.get("/get_list", async (req, res) => {
  const quote = await img.getListOfImages();
  res.send(quote);
});

// only for locale Arbeiten! Remove
router.get("/do_job", async (req, res) => {
  if (JSON.stringify(req.body) !== "{}") {
    const password = req.body.password;
    if (password !== process.env.PRIVATE_APP_PASSWORD) {
      res.send("password is wrong!");
    } else {
      //do jobs

      const list = await img.getListOfImages();

      const filtered = await list.filter(
        (obj) =>
          obj.size_before > 300 &&
          obj.path.includes("images/easyblog_articles/255/")
      );

      const url = "https://app.freud.online/images/optimize";
      const password = process.env.PRIVATE_APP_PASSWORD;

      filtered.forEach(async (obj) => {
        const body = {
          password: password,
          path: obj.path,
        };

        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            throw new Error("Network response was not ok");
          }

          const data = await response.json();
          console.log(data); // do something with the response data
        } catch (error) {
          console.error("Error:", error);
        }
      });

      res.send(filtered);
    }
  } else {
    res.send("no password provided!");
  }
});

module.exports = router;
