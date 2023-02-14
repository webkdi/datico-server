const express = require("express");
const helmet = require("helmet");
const cors= require("cors");
var cron = require('node-cron');
const upd = require("./components/UpdateFunctions")

const pm2 = require("pm2");
pm2.launchBus(function (err, bus) {
  bus.on("log:err", function (e) {
    //When a task throws errors
  });
});

const app = express();
app.use(helmet());
const PORT = process.env.PORT || 10000;


var allowedOrigins = ['http://localhost:3000','http://localhost:3001','http://localhost:8080','https://freud.online','https://app.freud.online','http://194.67.105.122'];
app.use(cors({
  origin: function(origin, callback){
    // allow requests with no origin 
    // (like mobile apps or curl requests)
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      var msg = Date().toString() + 'The CORS policy for this site does not ' +
                'allow access from the specified Origin '+origin;
      return callback(new Error(msg), false);
    } 
    return callback(null, true);
  }
}));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.use(express.json());

const routeTg = require("./routes/Telegram");
const routeIdeas = require("./routes/Ideas");
const routeUpdate = require("./routes/Update");

app.use("/tg", routeTg);
app.use("/ideas", routeIdeas);
app.use("/update", routeUpdate);

app.listen(PORT, () => {
  console.log(`Server starten on PORT ${PORT}`);
});

app.get('/testing', (req, res) => {
  res.send('Hello World!')
})

//updates
var updateStats = cron.schedule('1 1 * * * *', () =>  {
  console.log('cron running');
  upd.updateProcedure();
}, {
  scheduled: false
});
updateStats.start();
// # ┌────────────── second (optional)
// # │ ┌──────────── minute
// # │ │ ┌────────── hour
// # │ │ │ ┌──────── day of month
// # │ │ │ │ ┌────── month
// # │ │ │ │ │ ┌──── day of week
// # │ │ │ │ │ │
// # │ │ │ │ │ │
// # * * * * * *
//  '*/15 * * * * *' every 15 seconds