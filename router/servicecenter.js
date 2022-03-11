const express = require('express');
const router = express.Router();
const ServiceCenter = require('../schema/servicecenter');
const uploadS3 = require('../common/uploadS3');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');

//서비스 약관 불러오기
router.post('/getServicecenter', (req, res) => {
	controller(req, res, async () => {
		let serviceCenter = await ServiceCenter.model.find().sort('-_id').exec();
		if (!serviceCenter) {
			res.json({status: 400, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}
		res.json({status: 200, msg: serviceCenter});
	});
});
module.exports = router;
