const mysql = require("mysql2");
const { db, dbFreud } = require("./Connections.js");
const ogs = require("open-graph-scraper");
const axios = require("axios");

//yesterday
var yesterday = new Date();
var lastPeriod = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday = yesterday.toISOString().split("T")[0]; //YYYY-MM-DD
lastPeriod.setMonth(lastPeriod.getMonth() - 3);
lastPeriod = lastPeriod.toISOString().split("T")[0]; //YYYY-MM-DD

async function storeDaticoUserAnswers(device, answers) {
  const answersString = JSON.stringify(answers);
  var sql = `
    UPDATE datico.dt_user
    SET answersDone = ?
    WHERE deviceId = ?
    `;

  const [result] = await db.query(sql, [answersString, device]);

  if (result.affectedRows > 0) {
    return true;
  } else {
    console.log("error storing");
    return false;
  }
}

async function getDaticoUserAnswersOrCreateNew(device, sex) {
  var sql = `
    SELECT answersDone, traitJson
    FROM datico.dt_user where deviceId=?
    `;
  const [rows, fields] = await db.query(sql, [device]);
  // console.log(fields.map(field => field.name));

  if (rows.length === 0) {
    //no user exists -> create user

    var trait = {
      //dummy structure of personality, for string storage in DB
      attitude: {
        previous: 0,
        current: 0,
        intro: {
          single: 0,
          total: 0,
        },
        extra: {
          single: 0,
          total: 0,
        },
        questions: {
          single: 0,
          total: 0,
        },
        delta: 0,
        sum: 0,
      },
      position: {
        previous: 0,
        current: 0,
        active: {
          single: 0,
          total: 0,
        },
        passive: {
          single: 0,
          total: 0,
        },
        questions: {
          single: 0,
          total: 0,
        },
        delta: 0,
        sum: 0,
      },
      temp: {
        questions: 0,
        sum: 0,
        code: 0,
        sangva: {
          sum: 0,
          pc_direct: 0,
          pc_derived: 0,
        },
        mela: {
          sum: 0,
          pc_direct: 0,
          pc_derived: 0,
        },
        flegma: {
          sum: 0,
          pc_direct: 0,
          pc_derived: 0,
        },
        hole: {
          sum: 0,
          pc_direct: 0,
          pc_derived: 0,
        },
      },
      ego: {
        previous: 0,
        current: 0,
        questions: 0,
        nat: 0,
        psy: 0,
        log: 0,
      },
      group: 0,
      right: 0,
      questions: {
        done: 0,
        remaining: 0,
        total: 0,
      },
      level: {
        previous: 0,
        current: 0,
      },
      sex: sex,
      trait: 0,
      desc: "something",
      matches: [],
    };

    var dummyTrait = JSON.stringify(trait);

    var sql = `INSERT IGNORE INTO datico.dt_user (deviceId, sex, traitJson) 
    VALUES ('${device}', '${sex}', '${dummyTrait}')`;
    // console.log(sql);
    const [result] = await db.query(sql);

    if (result.affectedRows > 0) {
      return [];
    } else {
      console.log("error getting datico user");
      return [];
    }
  } else {
    return rows[0];
  }
}



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

async function getDaticoTraitCodes() {
  const sql = `
  SELECT *
  FROM datico.dt_p_trait
  ORDER BY psycho
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


async function chatCreateDevice(deviceId) {
  const sql = `
  INSERT IGNORE INTO datico.chat_device (device_id)
  VALUES ('${deviceId}')
  `;

  try {
    const [res] = await db.query(sql);
    return;
  } catch (err) {
    console.log(update_id, "error in Device Id store");
  }
}

async function chatStoreMessage(deviceId, step, message, uniqueId) {
  var sql = '';
  if (step == 1 ) { // is a question
    sql = `
    INSERT IGNORE INTO datico.chat_messages (device_id, question, hashkey)
    VALUES ('${deviceId}','${message}','${uniqueId}')
    `;
  } else {
    sql = `
    UPDATE datico.chat_messages 
    SET answer =  '${message}'
    WHERE hashkey='${uniqueId}'
    `;
  }

  try {
    const [res] = await db.query(sql);
    return;
  } catch (err) {
    console.log(deviceId, "error in message storage");
  }
}

async function chatGetUserTokens(deviceId) {
  // const sql=`
  // SELECT tokens, messages, status, timestamp, count(device_id) as devices
  // FROM datico.chat_device
  // WHERE device_id='${deviceId}'
  // GROUP BY tokens, messages
  // `;
  // console.log(sql);
  try {
    const [res] = await db.query(
      `
      SELECT tokens, messages, status, timestamp, count(device_id) as devices
      FROM datico.chat_device
      WHERE device_id=?
      GROUP BY tokens, messages
      `,
      [deviceId]
    );
    return res;
  } catch (err) {
    console.log(deviceId, "error storing tokens");
  }
}

async function chatIncreaseUserTokens(deviceId, messageCount, tokens, status) {
  const sql = `
  UPDATE datico.chat_device 
  SET tokens=${tokens}, 
  messages=${messageCount},
  status=${status}
  WHERE device_id='${deviceId}'
  `;
  try {
    const [res] = await db.query(sql);
    // console.log('tokens update', res);
    return res;
  } catch (err) {
    console.log(deviceId, "error read tokens");
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
  getDaticoUserAnswersOrCreateNew,
  storeDaticoUserAnswers,
  getDaticoTraitCodes,
  chatCreateDevice,
  chatStoreMessage,
  chatGetUserTokens,
  chatIncreaseUserTokens,
};
