const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Feed = require('../schema/feed');
const uploadS3 = require('../common/uploadS3');
const {controller, controllerLoggedIn} = require('./controller');

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

module.exports = router;
