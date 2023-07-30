const express = require("express");
const router = express.Router();
const sb = require("../components/SaleBot");

router.post("/salebot_webhook", async (req, res) => {
    // res.send(`you've called salebot webhook`);
    if (JSON.stringify(req.body) !== "{}") {
        const returning = await sb.enterClientFromWebhook(req.body);
        // res.send(req.body);
        res.send(returning);
      } else {
        console.log(Date().toString(), "get / no data received");
      }

    
});

module.exports = router;
