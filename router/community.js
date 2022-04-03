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
		let query = {};

		//받은 파라미터 확인
		for (let filed in req.body) {
			req.body[filed] !== '' ? (query[filed] = req.body[filed]) : null;
		}

		//임의로 넣어주지 않으면 얼마전에 작성한 게시물의 시간대로 생성 되는 문제 존재함. 해결책으로 현재 시간 별도로 insert 진행.
		query.community_date = Date.now();

		//오브젝트 형식의 데이터는 별도로 조건문 필요
		query.community_interests =
			typeof req.body.community_interests == 'string' ? JSON.parse(req.body.community_interests) : req.body.community_interests;
		query.community_address = typeof req.body.community_address == 'string' ? JSON.parse(req.body.community_address) : req.body.community_address;

		var community = await Community.makeNewdoc(query);
		let resultCommunity = await community.save();
		res.json({status: 200, msg: resultCommunity});
	});
});

//커뮤니티를 불러옴(전체 홈화면)
router.post('/getCommunityList', (req, res) => {
	controller(req, res, async () => {
		let community = await Community.model
			.find({community_type: req.body.community_type})
			.populate('community_writer_id', 'user_profile_uri user_nickname')
			.populate('community_avatar_id')
			.where('community_is_delete')
			.ne(true)
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

//커뮤니티 게시물 수정(삭제 기능 포함)
router.post('/updateAndDeleteCommunity', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		const fields = Object.keys(req.body);
		const query = {};

		//업데이트 진행되는 필드만 가져옴
		for (let i = 0; i < fields.length; i++) {
			query[fields[i]] = Object.values(req.body)[i];
		}

		//업데이트 날짜에 해당되는 필드는 항상 별도로 추가 입력 필요
		query.community_update_date = Date.now();

		//오브젝트 데이터는 반드시 이런 형식으로 체크 필요
		if (query.community_interests) {
			query.community_interests =
				typeof req.body.community_interests == 'string' ? JSON.parse(req.body.community_interests) : req.body.community_interests;
		}

		if (query.community_address) {
			query.community_address = typeof req.body.community_address == 'string' ? JSON.parse(req.body.community_address) : req.body.community_address;
		}

		//데이터가 들어온 필드만 업데이트를 진행
		const result = await Community.model.findByIdAndUpdate(
			{_id: req.body.community_object_id},
			{
				$set: query,
			},
			{new: true},
		);

		res.json({
			status: 200,
			msg: result,
		});
	});
});

module.exports = router;
