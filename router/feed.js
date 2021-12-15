const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Feed = require('../schema/feed');
const uploadS3 = require('../common/uploadS3');
const {controller, controllerLoggedIn} = require('./controller');
const {USER_NOT_FOUND, ALERT_NOT_VALID_USEROBJECT_ID, ALERT_NO_RESULT} = require('./constants');

//피드 글쓰기
router.post('/createFeed', uploadS3.array('media_uri'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let feed = await Feed.makeNewdoc({
			feed_content: req.body.feed_content,
			feed_location: req.body.feed_location,
			feed_type: 'feed',
			feed_avatar_id: req.body.feed_avatar_id,
			feed_medias: JSON.parse('[' + req.body.feed_medias + ']'),
			feed_writer_id: req.session.loginUser,
		});
		if (req.files.length > 0) {
			feed.feed_medias.map((v, i) => {
				v.media_uri = req.files[i].location;
			});
			feed.feed_thumbnail = feed.feed_medias[0].media_uri;
		}

		let newFeed = await feed.save();
		res.status(200);
		res.json({status: 200, msg: newFeed});
	});
});

//실종 게시물 쓰기
router.post('/createMissing', uploadS3.array('media_uri'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let missing = await Feed.makeNewdoc({
			feed_content: req.body.feed_content,
			feed_location: req.body.feed_location,
			feed_type: 'missing',
			feed_medias: JSON.parse('[' + req.body.feed_medias + ']'),
			feed_writer_id: req.session.loginUser,

			missing_animal_age: req.body.missing_animal_age,
			missing_animal_features: req.body.missing_animal_features,
			missing_animal_contact: req.body.missing_animal_contact,
			missing_animal_lost_location: req.body.missing_animal_lost_location,
			missing_animal_sex: req.body.missing_animal_sex,
			missing_animal_species: req.body.missing_animal_species,
			missing_animal_species_detail: req.body.missing_animal_species_detail,
			missing_animal_date: req.body.missing_animal_date,
		});

		if (req.files.length > 0) {
			missing.feed_medias.map((v, i) => {
				v.media_uri = req.files[i].location;
			});
			missing.feed_thumbnail = missing.feed_medias[0].media_uri;
		}

		let newMissing = await missing.save();
		res.status(200);
		res.json({status: 200, msg: newMissing});
	});
});

//제보 게시물 쓰기
router.post('/createReport', uploadS3.array('media_uri'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let report = await Feed.makeNewdoc({
			feed_content: req.body.feed_content,
			feed_location: req.body.feed_location,
			feed_type: 'report',
			feed_medias: JSON.parse('[' + req.body.feed_medias + ']'),
			feed_writer_id: req.session.loginUser,

			report_witness_date: req.body.report_witness_date,
			report_witness_location: req.body.report_witness_location,
		});

		if (req.files.length > 0) {
			report.feed_medias.map((v, i) => {
				v.media_uri = req.files[i].location;
			});
			report.feed_thumbnail = report.feed_medias[0].media_uri;
		}

		let newReport = await report.save();
		res.status(200);
		res.json({status: 200, msg: newReport});
	});
});

//특정 유저가 작성한 피드 리스트를 불러온다.
router.post('/getFeedListByUserId', (req, res) => {
	controller(req, res, async () => {
		let user = await User.model.findById(req.body.userobject_id);
		if (!user) {
			res.status(400);
			res.json({status: 400, msg: ALERT_NOT_VALID_USEROBJECT_ID});
			return;
		}
		if (user.user_type == 'pet') {
			let petFeeds = await Feed.model.find({feed_avatar_id: req.body.userobject_id}).limit(req.body.request_number).exec();
			if (petFeeds.length < 1) {
				res.status(404);
				res.json({status: 404, user_type: 'pet', msg: ALERT_NO_RESULT});
				return;
			}
			res.status(200);
			res.json({status: 200, user_type: 'pet', msg: petFeeds});
			return;
		} else {
			let userFeeds = await Feed.model.find({feed_writer_id: req.body.userobject_id}).limit(req.body.request_number).exec();
			if (userFeeds < 1) {
				res.status(404);
				res.json({status: 404, user_type: user.user_type, msg: ALERT_NO_RESULT});
				return;
			}
			res.status(200);
			res.json({status: 200, user_type: user.user_type, msg: userFeeds});
			return;
		}
	});
});

//실종/제보 요청을 가져온다.
router.post('/getMissingReportList', (req, res) => {
	controller(req, res, async () => {
		let reportMissingList = Feed.model.find({feed_type: {$ne: 'feed'}});
		if (req.body.city) {
			reportMissingList.find({
				$or: [{missing_animal_lost_location: {$regex: req.body.city}}, {report_witness_location: {$regex: req.body.city}}],
			});
		}
		if (req.body.missing_animal_species) {
			console.log('d');
			reportMissingList.find({
				$or: [{missing_animal_species: {$regex: req.body.missing_animal_species}}, {report_animal_species: {$regex: req.body.missing_animal_species}}],
			});
		}

		reportMissingList = await reportMissingList.exec();

		res.status(200);
		res.json({status: 200, msg: reportMissingList});
	});
});

module.exports = router;
