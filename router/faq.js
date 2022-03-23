const express = require('express');
const router = express.Router();
const Faq = require('../schema/faq');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');

//자주 묻는 질문 생성
router.post('/createFaq', (req, res) => {
	controller(req, res, async () => {
		let faq = await Faq.makeNewdoc({
			faq_title: req.body.faq_title,
			faq_contents: req.body.faq_contents,
		});

		const resultFaq = await faq.save();
		res.json({status: 200, msg: resultFaq});
	});
});

//자주 묻는 질문 불러오기
router.post('/getFaq', (req, res) => {
	controller(req, res, async () => {
		let faq = await Faq.model.find().sort('-_id').exec();
		if (!faq) {
			res.json({status: 400, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}
		res.json({status: 200, msg: faq});
	});
});
module.exports = router;
