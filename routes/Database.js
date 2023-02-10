const mysql = require("mysql2");
const ogs = require("open-graph-scraper");
const axios = require("axios");

const db = mysql
  .createPool({
    host: "194.67.105.122",
    user: "datico",
    password: "oA4rG5kK0d",
    database: "datico",
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
    idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
    queueLimit: 0
  })
  .promise();

// db.connect((err) => {
//   if (err) {
//     throw err;
//   }
//   console.log("Mysql connected");
// });

//yesterday
var yesterday = new Date();
var lastPeriod = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday = yesterday.toISOString().split("T")[0]; //YYYY-MM-DD
lastPeriod.setMonth(lastPeriod.getMonth() - 3);
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

var ymRequestOptions = {
  // method: "GET",
  headers: {
    Authorization: "OAuth AQAAAAAKR6bdAAdww3IEN3DdDkkWsuP4j_ygy6E",
  },
  redirect: "follow",
};

async function getVisitsStatsDay() {
  let url = `https://api-metrika.yandex.net/stat/v1/data?ids=61404367&dimensions=ym:pv:URLPath&accuracy=full&proposed_accuracy=false&limit=1000&metrics=ym:pv:users&date1=${yesterday}`;

  try {
    const response = await axios.get(url, ymRequestOptions);
    const result = await response.data.data;

    const delResult = await db.query(`truncate stat_visits_day`);

    result.forEach((e) => {
      let visit = { url: e.dimensions[0].name, visits: e.metrics[0] };
      //   lastVisits.push(visit);
      let sql = "insert into stat_visits_day SET ?";
      db.query(sql, visit, (err, res) => {
        if (err) throw err;
      });
    });
  } catch (error) {
    if (error.response) {
      let { status, statusText } = error.response;
      console.log(status, statusText);
      response.status(status).send(statusText);
    } else {
      response.status(404).send(error);
    }
  }

}

async function getVisitsStatsWeek() {
  let url =
    "https://api-metrika.yandex.net/stat/v1/data?ids=61404367&metrics=ym:pv:users &dimensions=ym:pv:URLPath&accuracy=full&proposed_accuracy=false&limit=1000";

  try {
    const response = await axios.get(url, ymRequestOptions);
    const result = await response.data.data;
    const delResult = await db.query(`truncate stat_visits_week`);

    result.forEach((e) => {
      // console.log(e.dimensions[0].name);
      let visit = { url: e.dimensions[0].name, visits: e.metrics[0] };
      let sql = "insert into stat_visits_week SET ?";
      db.query(sql, visit, (err, res) => {
        if (err) throw err;
      });
    });
  } catch (error) {
    if (error.response) {
      let { status, statusText } = error.response;
      console.log(status, statusText);
      res.status(status).send(statusText);
    } else {
      res.status(404).send(error);
    }
  }
}

async function getVisitsUser(ymUid) {
  console.log("start update user stats");

  let url = `https://api-metrika.yandex.net/stat/v1/data?ids=61404367&filters=ym:s:clientID==${ymUid}&metrics=ym:s:pageviews&dimensions=ym:s:dateTime,ym:s:startURLPath&date1=${lastPeriod}`;

  var result;
  try {
    const response = await axios.get(url, ymRequestOptions);
    result = await response.data.data;
  } catch (error) {
    if (error.response) {
      let { status, statusText } = error.response;
      console.log(status, statusText);
    } else {
      // response.status(404).send(error);
      console.log("unknown error");
    }
  }

  const [resDelete] = await db.query(`delete from stat_user where user = ?`, [
    ymUid,
  ]);

  result.forEach((e) => {
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
}

async function getSuggestions() {
  let sql = `
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
    (SELECT 'popWeek' AS type, a.url, og_title, og_description, og_image
    FROM datico.stat_links a JOIN (
      SELECT url FROM datico.stat_visits_day 
      WHERE locate("/articles/",url)>0
      order by visits desc limit 3
    ) b ON a.url LIKE CONCAT('%',b.url,'%'))
  `;
  try {
    const [res] = await db.query(sql);
    return res;
  } catch (err) {
    // await db.rollback();
    console.log(err);
  } 
}

async function updateOgLinks() {
  const [res] = await db.query(
    `SELECT id, url FROM datico.stat_links WHERE og_image is null or og_image=''`
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
