const express = require('express');
const router = express.Router();
const Notice = require('../schema/notice');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');
const mongoose = require('mongoose');

//알림 정보 생성
router.post('/createNotice', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let notice = await Notice.makeNewdoc({
			notice_user_id: req.session.loginUser,
		});

		let resultNotice = await notice.save();
		res.json({status: 200, msg: resultNotice});
	});
});

//알림 정보 불러오기
router.post('/getNotice', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let notice = await Notice.model.find({notice_user_id: mongoose.Types.ObjectId(req.session.loginUser)});
		if (!notice) {
			res.json({status: 400, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}
		res.json({status: 200, msg: notice});
	});
});

//알림 상태 업데이트
router.post('/updateNotice', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let notice = await Notice.model.findOne({notice_user_id: mongoose.Types.ObjectId(req.session.loginUser)}).exec();
		if (!notice) {
			res.json({status: 400, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}

		notice.notice_all = req.body.notice_all;
		notice.notice_pet_vaccination = req.body.notice_pet_vaccination;
		notice.notice_follow = req.body.notice_follow;
		notice.notice_my_post = req.body.notice_my_post;
		notice.notice_tag = req.body.notice_tag;
		notice.notice_my_applicant = req.body.notice_my_applicant;
		notice.notice_alarm = req.body.notice_alarm;

		notice.notice_update_date = Date.now();
		await notice.save();

		res.json({status: 200, msg: notice});
	});
});
module.exports = router;
