const express = require ("express");
const helmet = require("helmet");
// const cors= require("cors");

const app = express();
// app.use(helmet());
// const PORT = process.env.PORT || 3000
const PORT = 3000;

// app.use(cors({
//   origin: "http://localhost:8080",
// }))

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.use(express.json());

const routeTg = require('./routes/Telegram');
const routeIdeas = require('./routes/Ideas');

app.use('/tg',routeTg);
app.use('/ideas',routeIdeas);

app.listen(PORT, () => {
  console.log("Server starten on PORT 3000");
});

