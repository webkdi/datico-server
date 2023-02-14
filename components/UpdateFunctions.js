const db = require("../routes/Database");

var ymUid = "1671725728941382753";
//data are current?
async function updateStatIfNeeded() {
  const latest = await db.checkLatest(ymUid);
  const latestDateUser = new Date(latest.dateUser);
  const latestDateDay = new Date(latest.dateDay);
  const nowTime = new Date();
  const diffUser = Math.floor((nowTime - latestDateUser) / 1000 / 60 / 60);
  const diffDay = Math.floor((nowTime - latestDateDay) / 1000 / 60 / 60);
  // console.log(
  //   "now:",
  //   nowTime,
  //   "yandex",
  //   latestDateDay,
  //   diffDay,
  //   "user:",
  //   latestDateUser,
  //   diffUser
  // );

  if (diffUser >= 1) {
    db.getVisitsUser(ymUid);
  }

  if (diffDay >= 1) {
    db.getVisitsStatsDay();
    db.getVisitsStatsWeek();
  }

  if (diffDay < 1 && diffUser < 1) {
    const event = new Date();
    console.log(event.toString(), "no yandex update needed");
  }
  return;
}

async function updateLinks() {
  const freudLinks = await db.getFreudLinks();
  const statLinks = await db.getSavedLinks();

  const linksCompare = freudLinks.map((newEv) => {
    const oldFound = statLinks.filter((oldEv) => oldEv["url"] === newEv["url"]);
    if (oldFound.length > 0) {
      newEv.id = oldFound[0].id;
      newEv.hashcheckOld = oldFound[0].hashcheck;
    } else {
      newEv.id = 0;
      newEv.hashcheckOld = "";
    }
    return newEv;
  });

  let linksNew = linksCompare.filter((el) => {
    return el.id === 0 || el.hashcheck !== el.hashcheckOld;
  });
  let linksDelete = linksCompare.filter((el) => {
    return el.id > 0 && el.hashcheck !== el.hashcheckOld;
  });
  let linksUnchanged = linksCompare.filter((el) => {
    return el.id > 0 && el.hashcheck === el.hashcheckOld;
  });

  let linksTest = linksCompare.filter((el) => {
    // return el.id==1354;
    return el.id > 1350;
  });

  console.log(
    "new:",
    linksNew.length,
    "delete: ",
    linksDelete.length,
    "unchanged: ",
    linksUnchanged.length
  );

  linksNew.forEach((event) => {
    db.createLink(event);
    console.log("n", event.url.replace("https://freud.online/", ""));
  });
  linksDelete.forEach((event) => {
    db.deleteLink(event.id);
    console.log("d", event.id, event.url.replace("https://freud.online/", ""));
  });

  var urlInStat = new Set(freudLinks.map((f) => f.url));
  var deletedOnFreudSide = statLinks.filter((f) => !urlInStat.has(f.url));
  deletedOnFreudSide.forEach((link) => {
    db.deleteLink(link.id);
    console.log("rem", link.id, link.url.replace("https://freud.online/", ""));
  });
}

//SERVICING overnight: daily update of files
async function updateProcedure() {
  console.log(Date().toString(), "update requested");

  const links = await updateLinks();
  const check = await updateStatIfNeeded();
  const update = await db.updateOgLinks();
  console.log(Date().toString(), "update executed");

  return true;
}

module.exports = {
  updateProcedure,
};
