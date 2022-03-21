const express = require('express');
const router = express.Router();
const Community = require('../schema/community');
const uploadS3 = require('../common/uploadS3');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');
const mongoose = require('mongoose');

//
router.post('/changeLocalPathToS3Path', uploadS3.array('s3path'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		res.json({status: 200, msg: req.files});
	});
});

module.exports = router;
