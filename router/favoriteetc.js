const express = require('express');
const router = express.Router();
const FavoriteEtc = require('../schema/favoriteetc');
const User = require('../schema/user');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');
const mongoose = require('mongoose');

function makeSchema(str) {
	let index = str.indexOf('object');
	return str.substr(0, index);
}

//즐겨찾기 설정/취소 (피드외에 신규 추가되는 모든 게시물의 좋아요&취소를 다룸)
router.post('/setFavoriteEtc', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let collectionName = req.body.collectionName;
		let schemaName = makeSchema(collectionName);
		const Schema = require('../schema/' + schemaName);

		let targetObject = await Schema.model.findById(req.body.target_object_id);

		if (!targetObject) {
			res.json({status: 404, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}

		//주의 ! (클라이언트에서 넘어오는 값과 스웨거에서 넘어오는 데이터형 확인 필요 !)
		let is_favorite;
		if (typeof req.body.is_favorite == 'string') is_favorite = req.body.is_favorite == 'true' ? true : false;
		else is_favorite = req.body.is_favorite;

		let fieldName = schemaName;

		switch (schemaName) {
			case 'protectrequest':
				fieldName = 'protect_request';
		}

		let favorite_count = fieldName + '_favorite_count';

		//즐겨찾기 컬렉션 데이터 insert 혹은 update.
		let favoriteEtc = await FavoriteEtc.model
			.findOneAndUpdate(
				{favorite_etc_target_object_id: targetObject._id, favorite_etc_user_id: req.session.loginUser},
				{$set: {favorite_etc_collection_name: req.body.collectionName, favorite_etc_update_date: Date.now(), favorite_etc_is_delete: !is_favorite}},
				{new: true, upsert: true},
			)
			.exec();

		//즐겨찾기 컬렉션에서 is delete가 true가 아닌 것만 가져와서 count 확인.
		let count = await FavoriteEtc.model
			.find({favorite_etc_target_object_id: mongoose.Types.ObjectId(req.body.target_object_id)})
			.where('favorite_etc_is_delete')
			.ne(true)
			.count();

		//타겟 게시물 컬렉션의 즐겨찾기 갯수 입력.
		targetObject[favorite_count] = count;
		await targetObject.save();

		res.json({status: 200, msg: {favoriteEtc: favoriteEtc, targetObject: targetObject}});
	});
});

//특정 유저의 즐겨찾기 목록 조회 (피드를 제외한 타 게시물)
router.post('/getFavoriteEtcListByUserId', (req, res) => {
	controller(req, res, async () => {
		let user = await User.model.findById(req.body.userobject_id).lean();
		if (!user) {
			res.json({status: 400, msg: ALERT_NOT_VALID_USEROBJECT_ID});
			return;
		}

		//입력한 컬렉션 이름으로 스키마 정보 불러오기
		let collectionName = req.body.collectionName;
		let schemaName = makeSchema(collectionName);
		const Schema = require('../schema/' + schemaName);
		let writer_id = '';

		//모델 이름에 따른 게시물 작성자 populate 설정 변수 지정
		switch (Schema.model.modelName) {
			case 'CommunityObject':
				writer_id = 'community_writer_id';
				break;
			case 'ProtectRequestObject':
				writer_id = 'protect_request_writer_id';
				break;
		}

		//스키마 정보로 해당되는 게시판의 즐겨찾기 정보 불러오기
		let feedEtclist = await FavoriteEtc.model
			.find({
				favorite_etc_user_id: user._id,
				favorite_etc_is_delete: false,
				favorite_etc_collection_name: collectionName,
			})
			.populate({path: 'favorite_etc_target_object_id', model: Schema.model.modelName, populate: writer_id})
			.sort('-_id')
			.lean();

		let favoritedList = [];
		if (req.session.loginUser) {
			favoritedList = await FavoriteEtc.model
				.find({favorite_etc_user_id: req.session.loginUser, favorite_etc_is_delete: false, favorite_etc_collection_name: collectionName})
				.lean();

			feedEtclist = feedEtclist.map(feedEtclist => {
				if (favoritedList.find(favorited => favorited.favorite_etc_target_object_id == feedEtclist.favorite_etc_target_object_id._id)) {
					return {...feedEtclist, is_favorite: true};
				} else {
					return {...feedEtclist, is_favorite: false};
				}
			});
		}

		res.json({status: 200, msg: feedEtclist});
	});
});

module.exports = router;
