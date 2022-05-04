const express = require('express');
const router = express.Router();
const Community = require('../schema/community');
const uploadS3 = require('../common/uploadS3');
const LikeEtc = require('../schema/likeetc');
const FavoriteEtc = require('../schema/favoriteetc');
const User = require('../schema/user');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');
const mongoose = require('mongoose');
const WANT_DAY = 4;
const Follow = require('../schema/follow');

// 로컬정보를 s3 정보로 변경
router.post('/changeLocalPathToS3Path', uploadS3.array('s3path_uri'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		res.json({status: 200, msg: req.files});
	});
});

function removeHtml(text) {
	text = text.replace(/&nbsp;/gi, ' '); // 공백
	text = text.replace(/\n/gi, ''); // 띄어쓰기
	// HTML 태그제거
	text = text.replace(/(<([^>]+)>)/gi, '');
	return text;
}

// 커뮤니티 게시물 신규 작성
router.post('/createCommunity', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let query = {};

		//받은 파라미터 확인
		for (let filed in req.body) {
			req.body[filed] !== '' ? (query[filed] = req.body[filed]) : null;
		}

		query.community_writer_id = req.session.loginUser;

		//임의로 넣어주지 않으면 얼마전에 작성한 게시물의 시간대로 생성 되는 문제 존재함. 해결책으로 현재 시간 별도로 insert 진행.
		query.community_date = Date.now();

		//오브젝트 형식의 데이터는 별도로 조건문 필요
		query.community_interests =
			typeof req.body.community_interests == 'string' ? JSON.parse(req.body.community_interests) : req.body.community_interests;
		query.community_address = typeof req.body.community_address == 'string' ? JSON.parse(req.body.community_address) : req.body.community_address;
		query.community_content_without_html = removeHtml(query.community_content);

		var community = await Community.makeNewdoc(query);
		let resultCommunity = await community.save();
		res.json({status: 200, msg: resultCommunity});
	});
});

//커뮤니티를 불러옴(전체 홈화면)
router.post('/getCommunityList', (req, res) => {
	controller(req, res, async () => {
		let community;

		let now = new Date();
		let result_wantday = new Date(now.setDate(now.getDate() - WANT_DAY));
		result_wantday_format = new Date(+result_wantday + 3240 * 10000).toISOString().split('T')[0];
		let dateType = new Date(result_wantday_format);

		let dateList = await Community.model
			.find({
				community_date: {
					$gte: new Date(dateType),
				},
				community_type: 'review',
			})
			.where('community_is_delete')
			.ne(true)
			.lean();

		let max = 0;
		let max_community_id;
		let max_second = 0;
		let max_second_community_id;

		for (let i = 0; i < dateList.length; i++) {
			like_count = dateList[i].community_like_count;
			favorite_count = dateList[i].community_favorite_count;
			comment_count = dateList[i].community_comment_count;
			total = like_count + favorite_count + comment_count;

			if (total > max) {
				max_second = max;
				max = total;
				max_second_community_id = max_community_id;
				max_community_id = dateList[i]._id;
			} else if (total > max_second) {
				max_second = total;
				max_second_community_id = dateList[i]._id;
			}
		}

		//최대값과 두번째 최대값이 존재 할 경우 둘다 등록한다.
		if (max > 0 && max_second > 0) {
			await Community.model
				.find({community_is_recomment: true}, {community_type: 'review'})
				.updateMany({$set: {community_is_recomment: false}})
				.lean();

			await Community.model
				.find({_id: {$in: [max_community_id, max_second_community_id]}})
				.updateMany({$set: {community_is_recomment: true}})
				.lean();
		}
		//최대값만 존재 할 경우 - 나머지 한개는 랜덤으로 한개 추가해야 함.
		else if (max > 0) {
			await Community.model
				.find({community_is_recomment: true}, {community_type: 'review'})
				.updateMany({$set: {community_is_recomment: false}})
				.lean();

			await Community.model.findOneAndUpdate({_id: max_community_id}, {$set: {community_is_recomment: true}}).lean();
			let tempArray = Array();
			for (let i = 0; i < dateList.length; i++) {
				if (!dateList[i]._id.equals(max_community_id)) {
					tempArray.push(dateList[i]._id);
				}
			}
			let selectIndex = Math.floor(Math.random() * (tempArray.length - 0)) + 0;
			await Community.model
				.find({_id: {$in: [max_community_id, tempArray[selectIndex]]}})
				.updateMany({$set: {community_is_recomment: true}})
				.lean();
		}
		//최대값이 존재 하지 않을 경우 (글쓴이 외 다른 사용자들의 활동이 없을 경우)
		else {
			let selectIndex1 = Math.floor(Math.random() * (dateList.length - 0)) + 0;
			for (let i = 0; i < 10000; i++) {
				selectIndex2 = Math.floor(Math.random() * (dateList.length - 0)) + 0;
				if (selectIndex1 == selectIndex2) continue;
				else break;
			}

			await Community.model
				.find({community_is_recomment: true}, {community_type: 'review'})
				.updateMany({$set: {community_is_recomment: false}})
				.lean();

			await Community.model
				.find({_id: {$in: [dateList[selectIndex1]._id, dateList[selectIndex2]._id]}})
				.updateMany({$set: {community_is_recomment: true}})
				.lean();
		}

		if (req.body.community_type == 'all') {
			community = await Community.model
				.find()
				.populate('community_writer_id')
				.populate('community_avatar_id')
				.where('community_is_delete')
				.ne(true)
				.sort('-_id')
				.lean();
		} else {
			community = await Community.model
				.find({community_type: req.body.community_type})
				.populate('community_writer_id')
				.populate('community_avatar_id')
				.where('community_is_delete')
				.ne(true)
				.sort('-_id')
				.lean();
		}
		if (!community) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		let likedCommunityList = [];
		if (req.session.loginUser) {
			likedCommunityList = await LikeEtc.model.find({like_etc_user_id: req.session.loginUser, like_etc_is_delete: false}).lean();
		}

		community = community.map(community => {
			if (likedCommunityList.find(likedCommunity => likedCommunity.like_etc_post_id == community._id)) {
				return {...community, community_is_like: true};
			} else {
				return {...community, community_is_like: false};
			}
		});

		let favoritedCommunityList = [];
		if (req.session.loginUser) {
			favoritedCommunityList = await FavoriteEtc.model.find({favorite_etc_user_id: req.session.loginUser, favorite_etc_is_delete: false}).lean();
		}

		community = community.map(community => {
			if (favoritedCommunityList.find(favoritedCommunity => favoritedCommunity.favorite_etc_target_object_id == community._id)) {
				return {...community, community_is_favorite: true};
			} else {
				return {...community, community_is_favorite: false};
			}
		});

		res.json({
			status: 200,
			msg: {
				free: community.filter(v => v.community_type == 'free'),
				review: community.filter(v => v.community_type == 'review'),
			},
		});
	});
});

//특정 유저가 작성한 커뮤니티를 불러옴
router.post('/getCommunityListByUserId', (req, res) => {
	controller(req, res, async () => {
		let user = await User.model.findById(req.body.userobject_id);
		if (!user) {
			res.json({status: 400, msg: ALERT_NOT_VALID_USEROBJECT_ID});
			return;
		}

		let query = {};
		if (user.user_type == 'pet') {
			if (req.body.community_type == 'all') {
				query.community_avatar_id = req.body.userobject_id;
			} else {
				(community_avatar_id = req.body.userobject_id), (community_type = req.body.community_type);
			}
		} else {
			if (req.body.community_type == 'all') {
				query.community_writer_id = req.body.userobject_id;
			} else {
				(community_writer_id = req.body.userobject_id), (community_type = req.body.community_type);
			}
		}

		let community;
		community = await Community.model
			.find(query)
			.populate('community_writer_id')
			.populate('community_avatar_id')
			.where('community_is_delete')
			.ne(true)
			.sort('-_id')
			.lean();

		let likedCommunityList = [];
		if (req.session.loginUser) {
			likedCommunityList = await LikeEtc.model.find({like_etc_user_id: req.session.loginUser, like_etc_is_delete: false}).lean();
		}

		community = community.map(community => {
			if (likedCommunityList.find(likedCommunity => likedCommunity.like_etc_post_id == community._id)) {
				return {...community, community_is_like: true};
			} else {
				return {...community, community_is_like: false};
			}
		});

		let favoritedCommunityList = [];
		if (req.session.loginUser) {
			favoritedCommunityList = await FavoriteEtc.model.find({favorite_etc_user_id: req.session.loginUser, favorite_etc_is_delete: false}).lean();
		}

		community = community.map(community => {
			if (favoritedCommunityList.find(favoritedCommunity => favoritedCommunity.favorite_etc_target_object_id == community._id)) {
				return {...community, community_is_favorite: true};
			} else {
				return {...community, community_is_favorite: false};
			}
		});

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
		const result = await Community.model
			.findByIdAndUpdate(
				{_id: req.body.community_object_id},
				{
					$set: query,
				},
				{new: true},
			)
			.populate('community_writer_id')
			.exec();

		res.json({
			status: 200,
			msg: result,
		});
	});
});

//카테고리 검색
router.post('/getSearchCommunityList', (req, res) => {
	controller(req, res, async () => {
		let keyword = req.body.searchKeyword;

		communityList = await Community.model
			.find({
				$or: [{community_title: {$regex: keyword}}, {community_content_without_html: {$regex: keyword}}],
			})
			.populate('community_writer_id')
			.lean();

		if (communityList.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		let favoritedCommunityList = [];

		//로그인 상태에서만 is_favorite 표출
		if (req.session.loginUser) {
			//내가 즐겨찾기를 누른 데이터 불러오기
			favoritedCommunityList = await FavoriteEtc.model
				.find({favorite_etc_user_id: req.session.loginUser, favorite_etc_is_delete: false, favorite_etc_collection_name: 'communityobjects'})
				.lean();

			//검색 데이터와 내가 즐겨찾기를 누른 데이터 조인해서 is_favorite 체크
			communityList = communityList.map(communityList => {
				if (favoritedCommunityList.find(favoritedCommunity => favoritedCommunity.favorite_etc_target_object_id == communityList._id)) {
					return {...communityList, is_favorite: true};
				} else {
					return {...communityList, is_favorite: false};
				}
			});

			followList = await Follow.model.find({follow_id: req.session.loginUser, follow_is_delete: false}).lean();
			communityList = communityList.map(communityList => {
				if (followList.find(follow => follow.follower_id.equals(communityList.community_writer_id._id))) {
					return {...communityList, is_follow: true};
				} else {
					return {...communityList, is_follow: false};
				}
			});
		}

		res.json({
			status: 200,
			msg: {
				free: communityList.filter(v => v.community_type == 'free'),
				review: communityList.filter(v => v.community_type == 'review'),
			},
		});
	});
});

//커뮤니티 오브젝트 ID로 상세 정보 불러오기
router.post('/getCommunityByObjectId', (req, res) => {
	controller(req, res, async () => {
		let community = await Community.model
			.findById(req.body.community_object_id)
			.populate('community_writer_id')
			.populate('community_avatar_id')
			.where('community_is_delete')
			.ne(true)
			.sort('-_id')
			.lean();

		if (!community) {
			res.json({status: 400, msg: ALERT_NOT_VALID_USEROBJECT_ID});
			return;
		}

		let likedCommunityList = [];
		if (req.session.loginUser) {
			likedCommunityList = await LikeEtc.model.find({like_etc_user_id: req.session.loginUser, like_etc_is_delete: false}).lean();
		}

		if (likedCommunityList.find(likedCommunity => likedCommunity.like_etc_post_id == community._id)) {
			community.community_is_like = true;
		} else {
			community.community_is_like = false;
		}

		let favoritedCommunityList = [];
		if (req.session.loginUser) {
			favoritedCommunityList = await FavoriteEtc.model.find({favorite_etc_user_id: req.session.loginUser, favorite_etc_is_delete: false}).lean();
		}

		if (favoritedCommunityList.find(favoritedCommunity => favoritedCommunity.favorite_etc_target_object_id == community._id)) {
			community.community_is_favorite = true;
		} else {
			community.community_is_favorite = false;
		}

		res.json({
			status: 200,
			msg: community,
		});
	});
});

module.exports = router;
