const express = require('express');
const router = express.Router();
const Community = require('../schema/community');
const uploadS3 = require('../common/uploadS3');
const LikeFeed = require('../schema/likefeed');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');
const mongoose = require('mongoose');

// 로컬정보를 s3 정보로 변경
router.post('/changeLocalPathToS3Path', uploadS3.array('s3path_uri'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		res.json({status: 200, msg: req.files});
	});
});

// 커뮤니티 게시물 신규 작성
router.post('/createCommunity', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let community = await Community.makeNewdoc({
			community_writer_id: req.session.loginUser,
			community_title: req.body.community_title,
			community_content: req.body.community_content,
			community_is_temporary: req.body.community_is_temporary,
			community_type: req.body.community_type,
			community_free_type: req.body.community_free_type,
			community_animal_type: req.body.community_animal_type,
			community_is_attached_file: req.body.community_is_attached_file,
			community_interests: typeof req.body.community_interests == 'string' ? JSON.parse(req.body.community_interests) : req.body.community_interests,
			community_address: typeof req.body.community_address == 'string' ? JSON.parse(req.body.community_address) : req.body.community_address,
		});

		if (req.body.community_avatar_id) {
			community.community_avatar_id = req.body.community_avatar_id;
		}

		let newCommunity = await community.save();
		res.json({status: 200, msg: newCommunity});
	});
});

//커뮤니티를 불러옴(전체 홈화면)
router.post('/getCommunityList', (req, res) => {
	controller(req, res, async () => {
		let community = await Community.model
			.find({community_type: req.body.community_type})
			.populate('community_writer_id', 'user_profile_uri user_nickname')
			.populate('community_avatar_id')
			.sort('-_id')
			.lean();
		if (!community) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({
			status: 200,
			msg: {
				free: community.filter(v => v.community_type == 'free'),
				review: community.filter(v => v.community_type == 'review'),
			},
		});
	});
});

module.exports = router;
