const express = require('express');
const router = express.Router();

//server health check
router.get('/health', (req, res) => {
	console.log("ip - %s | date - [%s] | method - %s | protocol - %s | host - %s | path - %s | user - %s | excute API", req.connection.remoteAddress, new Date(), req.method, req.protocol, req.hostname, req.originalUrl, req.session?.loginUser); // prettier-ignore
    res.status(200);
});


module.exports = router;
