const express = require('express');
const router = express.Router();
const LikeEtc = require('../schema/likeetc');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');
const mongoose = require('mongoose');

function makeSchema(str) {
	let index = str.indexOf('object');
	return str.substr(0, index);
}

// 좋아요&취소 (피드외에 신규 추가되는 모든 게시물의 좋아요&취소를 다룸)
router.post('/likeEtc', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let collectionName = req.body.collectionName;
		let schemaName = makeSchema(collectionName);
		const Schema = require('../schema/' + schemaName);

		let targetPost = await Schema.model.findById(req.body.post_object_id);

		if (!targetPost) {
			res.json({status: 404, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}

		//주의 ! (클라이언트에서 넘어오는 값과 스웨거에서 넘어오는 데이터형 확인 필요 !)
		let is_like;
		if (typeof req.body.is_like == 'string') is_like = req.body.is_like == 'true' ? true : false;
		else is_like = req.body.is_like;

		let like_count = schemaName + '_like_count';

		//좋아요 컬렉션 데이터 insert 혹은 update.
		let likeEtc = await LikeEtc.model
			.findOneAndUpdate(
				{like_etc_post_id: targetPost._id, like_etc_user_id: req.session.loginUser},
				{$set: {like_etc_collection_name: req.body.collectionName, like_etc_update_date: Date.now(), like_etc_is_delete: !is_like}},
				{new: true, upsert: true},
			)
			.exec();

		//좋아요 컬렉션에서 is delete가 true가 아닌 것만 가져와서 count 확인.
		let count = await LikeEtc.model
			.find({like_etc_post_id: mongoose.Types.ObjectId(req.body.post_object_id)})
			.where('like_etc_is_delete')
			.ne(true)
			.count();

		//타겟 게시물 컬렉션의 좋아요 갯수 입력.
		targetPost[like_count] = count;
		await targetPost.save();

		res.json({status: 200, msg: {likeEtc: likeEtc, targetPost: targetPost}});
	});
});

module.exports = router;
