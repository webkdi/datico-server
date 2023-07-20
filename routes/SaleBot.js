const express = require("express");
const router = express.Router();

router.get("/salebot_webhook", async (req, res) => {

    res.send(`you've called salebot webhook`);
    
});

module.exports = router;
