const express = require('express');
const router = express.Router();
const NoticeUser = require('../schema/noticeuser');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');
const mongoose = require('mongoose');
const YESTER_DAY = 1;
const THIS_MONTH = 31;

//소식 정보 생성
router.post('/createNoticeUser', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let query = {};
		//받은 파라미터 확인
		for (let filed in req.body) {
			req.body[filed] !== '' ? (query[filed] = req.body[filed]) : null;
		}
		var noticeUser = await NoticeUser.makeNewdoc(query);
		let resultNoticeUser = await noticeUser.save();
		res.json({status: 200, msg: resultNoticeUser});
	});
});

//소식 정보 불러오기
router.post('/getNoticeUserList', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		const page = parseInt(req.body.page) * 1 || 1;
		const limit = parseInt(req.body.limit) * 1 || 300;
		const skip = (page - 1) * limit;
		let now = new Date(); // 오늘
		nowformat = new Date(+now + 3240 * 10000).toISOString().split('T')[0];

		let yesterday = new Date(now.setDate(now.getDate() - YESTER_DAY)); // 어제
		yesterdayformat = new Date(+yesterday + 3240 * 10000).toISOString().split('T')[0];
		let dateTypeYesterday = new Date(yesterdayformat);

		let lastweek = new Date(now.setDate(now.getDate() - THIS_MONTH)); // 한달 전
		thisweekformat = new Date(+lastweek + 3240 * 10000).toISOString().split('T')[0];
		let dateTypeThisweek = new Date(thisweekformat);

		let noticeUser = await NoticeUser.model
			.find({notice_user_receive_id: req.session.loginUser, notice_user_date: {$gte: lastweek}})
			.populate('notice_user_related_id', 'user_profile_uri user_nickname')
			.sort('-_id')
			.skip(skip)
			.limit(limit)
			.exec();
		if (!noticeUser) {
			res.json({status: 400, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}

		res.json({
			status: 200,
			msg: {
				today: noticeUser.filter(v => {
					let value = JSON.stringify(v.notice_user_date).substr(1, 10);
					if (value == nowformat) return v;
				}),
				yesterday: noticeUser.filter(v => {
					let value = JSON.stringify(v.notice_user_date).substr(1, 10);
					if (value == yesterdayformat) return v;
				}),
				thisweek: noticeUser.filter(v => {
					let value = JSON.stringify(v.notice_user_date).substr(1, 10);
					let dateTypeValue = new Date(value);

					//어제 날짜보다 작고 일주일 전 날짜보다 큰 데이터 분류
					if (dateTypeValue.getTime() < dateTypeYesterday.getTime() && dateTypeValue.getTime() > dateTypeThisweek.getTime()) return v;
				}),
			},
		});
	});
});
module.exports = router;
