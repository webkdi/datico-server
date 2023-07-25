const express = require("express");
const router = express.Router();

router.post("/salebot_webhook", async (req, res) => {
    // res.send(`you've called salebot webhook`);
    console.log(req.body);
    res.send(req.body);
    
});

module.exports = router;
