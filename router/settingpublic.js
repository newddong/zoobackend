const express = require('express');
const router = express.Router();
const SettingPublic = require('../schema/settingpublic');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');
const mongoose = require('mongoose');

//공개 설정 정보 생성
router.post('/createSettingPublic', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let settingPublic = await SettingPublic.makeNewdoc({
			setting_public_user_id: req.session.loginUser,
		});

		settingPublic.save();
		res.json({status: 200, msg: settingPublic});
	});
});

//공개 설정 정보 불러오기
router.post('/getSettingPublic', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let settingPublic = await SettingPublic.model.find({setting_public_user_id: mongoose.Types.ObjectId(req.session.loginUser)});
		if (!settingPublic) {
			res.json({status: 400, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}
		res.json({status: 200, msg: settingPublic});
	});
});

//공개 설정 상태 업데이트
router.post('/updateSettingPublic', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let settingPublic = await SettingPublic.model.findOne({setting_public_user_id: mongoose.Types.ObjectId(req.session.loginUser)}).exec();
		if (!settingPublic) {
			res.json({status: 400, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}

		settingPublic.setting_public_all = req.body.setting_public_all;
		settingPublic.setting_public_my_feed = req.body.setting_public_my_feed;
		settingPublic.setting_public_my_tag_post = req.body.setting_public_my_tag_post;
		settingPublic.setting_public_community_post = req.body.setting_public_community_post;
		settingPublic.setting_public_update_date = Date.now();
		settingPublic.save();

		res.json({status: 200, msg: settingPublic});
	});
});
module.exports = router;
