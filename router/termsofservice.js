const express = require('express');
const router = express.Router();
const TermsOfService = require('../schema/termsofservice');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');

//이용 약관 생성
router.post('/createTermsOfService', (req, res) => {
	controller(req, res, async () => {
		let termsOfService = await TermsOfService.makeNewdoc({
			terms_of_service_title: req.body.terms_of_service_title,
			terms_of_service_contents: req.body.terms_of_service_contents,
		});

		const resultTermsOfService = await termsOfService.save();
		res.json({status: 200, msg: resultTermsOfService});
	});
});

//이용 약관 불러오기
router.post('/getTermsOfService', (req, res) => {
	controller(req, res, async () => {
		let termsOfService = await TermsOfService.model.find().sort('-_id').exec();
		if (!termsOfService) {
			res.json({status: 400, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}
		res.json({status: 200, msg: termsOfService});
	});
});
module.exports = router;
