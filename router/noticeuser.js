const express = require('express');
const router = express.Router();
const NoticeUser = require('../schema/noticeuser');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');
const mongoose = require('mongoose');

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

module.exports = router;
