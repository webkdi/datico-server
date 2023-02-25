require("dotenv").config();

const mysql = require("mysql2");
const ogs = require("open-graph-scraper");
const axios = require("axios");

const db = mysql
  .createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_DATICO_USER,
    password: process.env.DB_DATICO_PASSWORD,
    database: process.env.DB_DATICO_DB,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
    idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
    queueLimit: 0,
  })
  .promise();

const dbFreud = mysql
  .createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_FREUD_USER,
    password: process.env.DB_FREUD_PASSWORD,
    database: process.env.DB_FREUD_DB,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
    idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
    queueLimit: 0,
  })
  .promise();

//yesterday
var yesterday = new Date();
var lastPeriod = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday = yesterday.toISOString().split("T")[0]; //YYYY-MM-DD
lastPeriod.setMonth(lastPeriod.getMonth() - 3);
lastPeriod = lastPeriod.toISOString().split("T")[0]; //YYYY-MM-DD

async function truncateImageData() {
  const sql = `
  TRUNCATE TABLE serv_images
  `;
  try {
    const [res] = await db.query(sql);
    return res;
  } catch (err) {
    console.log(err);
  }
}

async function storeImageData(file) {
  const sql = `
  INSERT IGNORE INTO datico.serv_images (path,name,type,size_before,hash,updated)
  VALUES ('${file.filePath}', '${file.fileName}', '${file.fileType}', ${file.fileSizeInKB}, '${file.hash}', '${file.fileModifiedTime}')
  `;
  try {
    const [res] = await db.query(sql);
    return res;
  } catch (err) {
    console.log(err);
  }
}

async function getImagesList() {
  const sql = `
  SELECT path, name, type, size_before, updated
  FROM datico.serv_images order by size_before desc
  `;
  try {
    const [res] = await db.query(sql);
    return res;
  } catch (err) {
    console.log(err);
  }
}

async function getFreudLinks() {
  const [res] = await dbFreud.query(
    `
  SELECT
  'event' AS type
  ,CONCAT('https://freud.online/events/',a.cluster_id,'-',b.alias) AS url
  ,a.start AS dateof
  ,CAST(MD5(CONCAT(a.start,b.title,b.description,b.alias )) AS CHAR(99)) as hashcheck
  FROM (
      SELECT cluster_id, start
      FROM freud.main_social_events_meta
      WHERE start_gmt> CURRENT_TIME()
  ) AS a JOIN freud.main_social_clusters AS b 
  ON a.cluster_id=b.id
  UNION
  SELECT 
  'article' AS type
  ,CONCAT('https://freud.online/articles/',permalink) AS url
  ,modified AS dateof
  ,CAST(MD5(CONCAT(modified,title,permalink,intro,image,media)) AS CHAR(99)) AS hashcheck
  FROM freud.main_easyblog_post
  WHERE published=1
  `
  );
  return res;
}

async function getDaticoQuiz() {
  const sql = `
  SELECT a.id_question
  ,a.question_long
  ,a.id_question
  ,a.psycho
  -- ,a.question_short
  ,b.id_answer
  -- ,b.answer_short
  ,b.answer_long
  ,b.trait
  ,c.code
  ,b.grade
  ,b.picture_url
  FROM datico.dt_q_questions AS a
  JOIN datico.dt_q_answers AS b 
  ON a.id_question=b.id_question
  JOIN datico.dt_p_trait AS c 
  ON b.trait=c.trait
  `;
  try {
    const [res] = await db.query(sql);
    return res;
  } catch (err) {
    console.log(err);
  }
}

async function deleteLink(id) {
  const [res] = await db.query(`delete from datico.stat_links where id = ?`, [
    id,
  ]);
  return res;
}

async function createLink(object) {
  const sql = `
    INSERT INTO datico.stat_links(type, url, dateof, hashcheck) 
    VALUES ('${object.type}', '${
    object.url
  }', '${object.dateof.toISOString()}', '${object.hashcheck}')`;
  // console.log(sql);
  try {
    const [res] = await db.query(sql);
    return res;
  } catch (err) {
    console.log(err);
  }
}

async function getSavedLinks() {
  let sql = "SELECT * FROM datico.stat_links";
  try {
    const [res] = await db.query(sql);
    return res;
  } catch (err) {
    // await db.rollback();
    console.log(err);
  }
}

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
  (
    SELECT 'event'as type, url, og_title, og_description, og_image
    FROM datico.stat_links 
    WHERE type='event' AND dateof>NOW() ORDER BY dateof LIMIT 1
  ) UNION (
    SELECT 'random', url, og_title, og_description, og_image
    FROM datico.stat_links 
    WHERE type='article' AND og_image <>'' 
    ORDER BY RAND() limit 1
  ) UNION (
    SELECT 'popular' AS type, a.url, og_title, og_description, og_image
    FROM datico.stat_links a JOIN (
      SELECT url FROM datico.stat_visits_day
          WHERE url<>'/'
      ORDER BY visits DESC LIMIT 10
    ) b ON a.url LIKE CONCAT('%',b.url,'%')
  ) UNION (
    SELECT 'newby' AS type, a.url, og_title, og_description, og_image
    FROM datico.stat_links a JOIN (
      SELECT url FROM datico.stat_visits_week 
      WHERE locate("/articles/",url)>0
      ORDER BY visits ASC LIMIT 5
    ) b ON a.url LIKE CONCAT('%',b.url,'%')
  )
  `;
  // try {
  const [res] = await db.query(sql);

  //remove url dublicates
  const seen = new Set();
  const uniqueUrl = res.filter((el) => {
    const duplicate = seen.has(el.url);
    seen.add(el.url);
    return !duplicate;
  });

  //take only one entry per topic
  // seen.clear();
  // let uniqueObjects = uniqueUrl.filter((el) => {
  //   const duplicate = seen.has(el.type);
  //   seen.add(el.type);
  //   return !duplicate;
  // });

  //take RANDOM per type
  var uniqueObjects = {};
  uniqueUrl.forEach((item) => {
    if (!uniqueObjects[item.type]) {
      uniqueObjects[item.type] = item;
    } else if (Math.random() >= 0.5) {
      uniqueObjects[item.type] = item;
    }
  });

  uniqueObjects = Object.keys(uniqueObjects).map((key) => uniqueObjects[key]);

  console.log(uniqueObjects);

  //att teaser text
  uniqueObjects.forEach((el) => {
    switch (el.type) {
      case "event":
        el.teaser = "Ближайшая встреча";
        break;
      case "random":
        el.teaser = "Может, Вам будет интересно";
        break;
      case "popular":
        el.teaser = "Популярная статья сегодня";
        break;
      case "newby":
        el.teaser = "Самородок недели";
        break;
      default:
        el.teaser = "Самое популярное";
    }
  });
  //random order
  uniqueObjects.sort(() => Math.random() - 0.5);

  return uniqueObjects;
  // } catch (err) {
  //   if (err.status === 200) {
  //     return true;
  //   } else {
  //     console.log('Error in sql get ideas');
  //     return false;
  //   }
  // }
}

async function updateOgLinks() {
  const [res] = await db.query(
    `SELECT id, url FROM datico.stat_links 
    WHERE 
      (og_image='' and og_title='')`
  );
  let i = 0;
  const todo = res.length;
  for (const e of res) {
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
    i += 1;
    console.log("update OG", e.id, e.url, "сделано", i, "из", todo);
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

async function getRandomQuote() {
  let sql = `
  SELECT * FROM datico.quotes ORDER BY RAND() LIMIT 1
  `;
  try {
    const [res] = await db.query(sql);
    return res;
  } catch (err) {
    console.log(err);
  }
}

async function fbReportLatestUpdate() {
  const sql = `SELECT MAX(update_id) AS lastUpdateId FROM datico.serv_telegram`;
  try {
    const [res] = await db.query(sql);
    return res[0].lastUpdateId;
  } catch (err) {
    console.log(err);
  }
}

async function fbReportTrucate() {
  const sql = `
  truncate table datico.serv_telegram
  `;
  try {
    const [res] = await db.query(sql);
    return res;
  } catch (err) {
    console.log(err);
  }
}

async function fbReportInsert(update_id, type, file_path, message, page_id) {
  const sql = `
  INSERT IGNORE INTO datico.serv_telegram (update_id,type,file_path,message,page_id)
  VALUES (${update_id}, '${type}', '${file_path}', '${message}', ${page_id})
  `;

  // console.log(sql);

  try {
    const [res] = await db.query(sql);
    return;
  } catch (err) {
    console.log(update_id, "error in INSERT IGNORE INTO datico.serv_telegram");
  }
}

module.exports = {
  checkLatest,
  getVisitsStatsDay,
  getVisitsStatsWeek,
  getVisitsUser,
  getSuggestions,
  updateOgLinks,
  getRandomQuote,
  getFreudLinks,
  getSavedLinks,
  createLink,
  deleteLink,
  getOg,
  getDaticoQuiz,
  storeImageData,
  getImagesList,
  truncateImageData,
  fbReportTrucate,
  fbReportInsert,
  fbReportLatestUpdate,
};
