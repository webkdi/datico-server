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
const PORT = process.env.PORT || 10000;


var allowedOrigins = ['http://localhost:3000','http://localhost:3001','http://localhost:8080','https://freud.online','https://app.freud.online'];
app.use(cors({
  origin: function(origin, callback){
    // allow requests with no origin 
    // (like mobile apps or curl requests)
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      var msg = 'The CORS policy for this site does not ' +
                'allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

// app.use(cors({
//   origin: "http://localhost:3000",
// }));

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
  console.log(`Server starten on PORT ${PORT}`);
});

app.get('/testing', (req, res) => {
  res.send('Hello World!')
})