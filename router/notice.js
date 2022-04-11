const express = require('express');
const router = express.Router();
const Notice = require('../schema/notice');
const User = require('../schema/user');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING, USER_NOT_FOUND} = require('./constants');
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

//알림 정보 모두 true로 생성 (DB에 있는 사용자 일괄 적용)
router.post('/createNoticeAll', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let userList = await User.model.find({}).select('_id');

		for (let k = 0; k < userList.length; k++) {
			let query = {};
			query.notice_user_id = userList[k]._id;
			query.notice_update_date = Date.now();
			query.notice_all = true;
			query.notice_pet_vaccination = true;
			query.notice_follow = true;
			query.notice_my_post = true;
			query.notice_tag = true;
			query.notice_my_applicant = true;
			query.notice_memobox = true;
			query.notice_alarm = true;
			var noticeResult = await Notice.makeNewdoc(query);
			await noticeResult.save();
		}

		res.json({status: 200, msg: ''});
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
		notice.notice_memobox = req.body.notice_memobox;
		notice.notice_alarm = req.body.notice_alarm;

		notice.notice_update_date = Date.now();
		await notice.save();

		res.json({status: 200, msg: notice});
	});
});
module.exports = router;
