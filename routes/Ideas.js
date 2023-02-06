const express = require ("express");
const db = require("./Database")
const router = express.Router();

var ymUid = "1671725728941382753";
//data are current?
async function updateStatIfNeeded() {
  const latest = await db.checkLatest(ymUid);
  const latestDateUser = new Date(latest.dateUser);
  const latestDateDay = new Date(latest.dateDay);
  const nowTime = new Date();
  const diffUser = Math.floor((nowTime - latestDateUser) / 1000 / 60 / 60);
  const diffDay = Math.floor((nowTime - latestDateDay) / 1000 / 60 / 60);
  console.log('now:',nowTime, 'yandex', latestDateDay, diffDay, 'user:', latestDateUser, diffUser);

  if (diffUser >= 1) {
    db.getVisitsUser(ymUid);
  }

  if (diffDay >= 1) {
    db.getVisitsStatsDay();
    db.getVisitsStatsWeek();
  }

  if (diffDay < 1 && diffUser < 1) {
    console.log("no update needed");
  }
  return;
}

//SERVICING overnight: daily update of files
router.post("/update-og", async (req, res) => {
  const update = await db.updateOgLinks();
  res.status(200).send("data updated");
});

router.get("/get", async (req, res) => {
  const check = await updateStatIfNeeded();
  const ideas = await db.getSuggestions();
  res.send(ideas);
});

module.exports = router;