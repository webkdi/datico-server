// import mysql from "mysql2";
// import ogs from "open-graph-scraper";

const mysql = require("mysql2");
const ogs = require("open-graph-scraper");


const db = mysql
  .createConnection({
    host: "194.67.105.122",
    user: "datico",
    password: "oA4rG5kK0d",
    database: "datico",
  })
  .promise();

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log("Mysql connected");
});

// var ymHeaders = new Headers();
// ymHeaders.append("Cookie", "JSESSIONID=node0s0hgfezw4vy81c53iuyvx4iid14698474.node0");
// ymHeaders.append(
//   "Authorization",
//   "OAuth AQAAAAAKR6bdAAdww3IEN3DdDkkWsuP4j_ygy6E"
// );
var ymRequestOptions = {
  method: "GET",
  headers: {
    "Authorization": "OAuth AQAAAAAKR6bdAAdww3IEN3DdDkkWsuP4j_ygy6E",
  },
  redirect: "follow",
};


// getVisitsStatsWeek();
//yesterday
var yesterday = new Date();
var lastPeriod = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday = yesterday.toISOString().split("T")[0]; //YYYY-MM-DD
lastPeriod.setMonth(lastPeriod.getMonth() - 6);
lastPeriod = lastPeriod.toISOString().split("T")[0]; //YYYY-MM-DD

async function checkLatest(ymUid) {
  const [res] = await db.query(
    `
      SELECT dateUser, dateDay, dateWeek 
      FROM (SELECT MAX(created) as dateUser FROM stat_user where user = ?) a, 
      (SELECT MAX(created) as dateDay FROM stat_visits_day) b, 
      (SELECT MAX(created) as dateWeek FROM stat_visits_week) c
      `,
    [ymUid]
  );
  return res[0];
}

async function getVisitsStatsDay() {
  let url = `https://api-metrika.yandex.net/stat/v1/data?ids=61404367&dimensions=ym:pv:URLPath&accuracy=full&proposed_accuracy=false&limit=1000&metrics=ym:pv:users&date1=${yesterday}`;
  const response = await fetch(url, ymRequestOptions);
  if (!response.ok) {
    console.log("error: ", response.status);
  }
  const result = await response.json();
  const delResult = await db.query(`truncate stat_visits_day`);

  // .then((response) => response.json())
  // .then((result) => {
  //   const res = await db.query(`truncate stat_visits_day`);
  //   // db.query(sql, (err, res) => {
  //   //   if (err) throw err;
  //   // });
  //   // let lastVisits = [];
  //   // console.log(result.data);

  result.data.forEach((e) => {
    let visit = { url: e.dimensions[0].name, visits: e.metrics[0] };
    //   lastVisits.push(visit);
    let sql = "insert into stat_visits_day SET ?";
    db.query(sql, visit, (err, res) => {
      if (err) throw err;
    });
  });
}

async function getVisitsStatsWeek() {
  let url =
    "https://api-metrika.yandex.net/stat/v1/data?ids=61404367&metrics=ym:pv:users &dimensions=ym:pv:URLPath&accuracy=full&proposed_accuracy=false&limit=1000";
  const response = await fetch(url, ymRequestOptions);
  if (!response.ok) {
    console.log("error: ", response.status);
  }
  const result = await response.json();
  const delResult = await db.query(`truncate stat_visits_week`);

  result.data.forEach((e) => {
    let visit = { url: e.dimensions[0].name, visits: e.metrics[0] };
    let sql = "insert into stat_visits_week SET ?";
    db.query(sql, visit, (err, res) => {
      if (err) throw err;
    });
  });
  // })
  // .catch((error) => console.log("error", error));
}

async function getVisitsUser(ymUid) {
  let url = `https://api-metrika.yandex.net/stat/v1/data?ids=61404367&filters=ym:s:clientID==${ymUid}&metrics=ym:s:pageviews&dimensions=ym:s:dateTime,ym:s:startURLPath&date1=${lastPeriod}`;
  const response = await fetch(url, ymRequestOptions);
  if (!response.ok) {
    console.log("error: ", response.status);
  }
  const result = await response.json();
  const [resDelete] = await db.query(`delete from stat_user where user = ?`, [
    ymUid,
  ]);

  // fetch(url, ymRequestOptions)
  //   .then((response) => response.json())
  //   .then((result) => {
  //     let sql = `delete from stat_user where user='${ymUid}'`;
  //     db.query(sql, (err, res) => {
  //       if (err) throw err;
  //     });
  //     let sessions = [];
  result.data.forEach((e) => {
    let visit = {
      url: e.dimensions[1].name,
      user: ymUid,
      date: e.dimensions[0].name,
      views: e.metrics[0],
    };
    let sql = "insert into stat_user SET ?";
    db.query(sql, visit, (err, res) => {
      if (err) throw err;
    });
  });
  // })
  // .catch((error) => console.log("error", error));
}

async function getSuggestions() {
  const [res] = await db.query(
    `
    (SELECT 'event'as type, url, og_title, og_description, og_image
      FROM datico.stat_links 
      where type='event' and dateof>NOW() order by dateof limit 1)
    union
    (SELECT 'articleRandom', url, og_title, og_description, og_image
      FROM datico.stat_links 
      where type='article' and og_image <>'' 
      order by rand() limit 1)
	  union
    (SELECT 'popYesterday' as type, url, og_title, og_description, og_image
    FROM datico.stat_links 
    where locate((SELECT url FROM stat_visits_day where url<>'/'order by visits desc limit 1), url)>0)
      union
      (SELECT 'popWeek' as type, url, og_title, og_description, og_image
    FROM datico.stat_links 
    where locate((SELECT url FROM stat_visits_day where url<>'/'order by visits desc limit 1), url)>0)
      `
  );
  // console.log(res);
  return res;
}

async function updateOgLinks() {
  const [res] = await db.query(
    `SELECT id, url FROM datico.stat_links`
  );
  for (const e of res) {
    console.log(e);
    const og = await getOg(e.url);
    const ogData = {
      og_title: og.ogTitle,
      og_image: og.ogImage.url,
      og_description: og.ogDescription,
    };
    const [update] = await db.query(
      `
    update datico.stat_links set ? where id = ?
    `,
      [ogData, e.id]
    );
  }
}

async function getOg(url) {
  const options = { url: url };
  const ogData = await ogs(options);
  return ogData.result;
  // const { error, result, response } = data;
  // console.log('error:', error);  // This returns true or false. True if there was an error. The error itself is inside the results object.
  // console.log('result:', result); // This contains all of the Open Graph results
  // console.log('response:', response); // This contains the HTML of page
}

module.exports = {
  checkLatest,
  getVisitsStatsDay,
  getVisitsStatsWeek,
  getVisitsUser,
  getSuggestions,
  updateOgLinks,
};

// console.log(module);