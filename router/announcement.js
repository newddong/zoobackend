const express = require('express');
const router = express.Router();
const Announcement = require('../schema/announcement');
const uploadS3 = require('../common/uploadS3');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');

//공지 추가
router.post('/createAnnouncement', uploadS3.array('announcement_uri'), (req, res) => {
	controller(req, res, async () => {
		let announcement = await Announcement.makeNewdoc({
			announcement_title: req.body.announcement_title,
			announcement_contents: req.body.announcement_contents,
		});

		if (req.files && req.files.length > 0) {
			req.files.forEach(file => {
				announcement.announcement_uri.push(file.location);
			});
		}

		const newAnnouncement = await announcement.save();
		res.json({status: 200, msg: newAnnouncement});
	});
});

//공지 모두 불러오기
router.post('/getAllAnnouncement', (req, res) => {
	controller(req, res, async () => {
		let announcement = await Announcement.model.find().sort('-_id').exec();
		if (!announcement) {
			res.json({status: 400, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}
		res.json({status: 200, msg: announcement});
	});
});
module.exports = router;
