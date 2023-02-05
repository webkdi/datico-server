const express = require("express");
const helmet = require("helmet");
const cors= require("cors");

const pm2 = require("pm2");
pm2.launchBus(function (err, bus) {
  bus.on("log:err", function (e) {
    //When a task throws errors
  });
});

const app = express();
app.use(helmet());
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: "http://localhost:3000",
}));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.use(express.json());

const routeTg = require("./routes/Telegram");
const routeIdeas = require("./routes/Ideas");

app.use("/tg", routeTg);
app.use("/ideas", routeIdeas);

app.listen(PORT, () => {
  console.log("Server starten on PORT 3000");
});

// let axios = require("axios");
// var ymUid = "1631455669534331916";
// var url =
//   "https://api-metrika.yandex.net/stat/v1/data?ids=61404367&metrics=ym:pv:users &dimensions=ym:pv:URLPath&accuracy=full&proposed_accuracy=false&limit=1000";
// var ymRequestOptions = {
//   headers: {
//     Authorization: "OAuth AQAAAAAKR6bdAAdww3IEN3DdDkkWsuP4j_ygy6E",
//   },
//   redirect: "follow",
// };
// app.get("/test", async (req, res) => {
//   axios
//     .get(url, ymRequestOptions)
//     .then((response) => {
//       console.log(response);
//       res.send(response.data);
//     })
//     .catch((error) => {
//       if (error.response) {
//         let { status, statusText } = error.response;
//         console.log(status, statusText);
//         res.status(status).send(statusText);
//       } else {
//         res.status(404).send(error);
//       }
//     });
// });
