const express = require('express');
const router = express.Router();
const FavoriteEtc = require('../schema/favoriteetc');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');
const mongoose = require('mongoose');

function makeSchema(str) {
	let index = str.indexOf('object');
	return str.substr(0, index);
}

//피드 즐겨찾기 설정/취소 (피드외에 신규 추가되는 모든 게시물의 좋아요&취소를 다룸)
router.post('/favoriteEtc', (req, res) => {
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
		let is_favorite;
		if (typeof req.body.is_favorite == 'string') is_favorite = req.body.is_favorite == 'true' ? true : false;
		else is_favorite = req.body.is_favorite;

		let favorite_count = schemaName + '_favorite_count';

		//즐겨찾기 컬렉션 데이터 insert 혹은 update.
		let favoriteEtc = await FavoriteEtc.model
			.findOneAndUpdate(
				{favorite_etc_post_id: targetPost._id, favorite_etc_user_id: req.session.loginUser},
				{$set: {favorite_etc_collection_name: req.body.collectionName, favorite_etc_update_date: Date.now(), favorite_etc_is_delete: !is_favorite}},
				{new: true, upsert: true},
			)
			.exec();

		//즐겨찾기 컬렉션에서 is delete가 true가 아닌 것만 가져와서 count 확인.
		let count = await FavoriteEtc.model
			.findOne({favorite_etc_post_id: mongoose.Types.ObjectId(req.body.post_object_id)})
			.where('favorite_etc_is_delete')
			.ne(true)
			.count();

		//타겟 게시물 컬렉션의 좋아요 갯수 입력.
		targetPost[favorite_count] = count;
		await targetPost.save();

		res.json({status: 200, msg: {favoriteEtc: favoriteEtc, targetPost: targetPost}});
	});
});

module.exports = router;
