const express = require('express');
const router = express.Router();
const Community = require('../schema/community');
const uploadS3 = require('../common/uploadS3');
const LikeEtc = require('../schema/likeetc');
const FavoriteEtc = require('../schema/favoriteetc');
const Feed = require('../schema/feed');
const User = require('../schema/user');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');
const mongoose = require('mongoose');
const WANT_DAY = 4;
const Follow = require('../schema/follow');
const CommonCode = require('../schema/commoncode');

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

		//업로드 게시물 개수 업데이트
		let feedCount = await Feed.model
			.find({
				$or: [
					{$and: [{feed_type: 'feed'}, {feed_avatar_id: req.session.loginUser}]},
					{$and: [{feed_type: {$in: ['report', 'missing']}}, {feed_avatar_id: undefined}]},
				],
			})
			.where('feed_writer_id', req.session.loginUser)
			.where('feed_is_delete')
			.ne(true)
			.count();

		let communityCount = await Community.model.find({community_writer_id: req.session.loginUser}).where('community_is_delete').ne(true).count();
		let totalCount = feedCount + communityCount;

		let countUpdate = await User.model
			.findOneAndUpdate(
				{
					_id: req.session.loginUser,
				},
				{
					$set: {
						user_upload_count: totalCount,
					},
					$currentDate: {feed_update_date: true},
				},
				{new: true, upsert: true},
			)
			.lean();

		res.json({status: 200, msg: resultCommunity});
	});
});

async function addressMaching(adressData) {
	switch (adressData) {
		case '충청북도':
		case '충청남도':
		case '전라북도':
		case '전라남도':
		case '경상남도':
		case '경상북도':
			return adressData.substring(0, 1) + adressData.substring(2, 3);
		default:
			return adressData.substring(0, 2);
	}
}

//커뮤니티를 불러옴(전체 홈화면)
router.post('/getCommunityList', (req, res) => {
	controller(req, res, async () => {
		const page = parseInt(req.body.page) * 1 || 1;
		const limit = parseInt(req.body.limit) * 1 || 30;
		const skip = (page - 1) * limit;
		let community;
		let total_count;
		let query = {};
		let city = '';
		let district = '';

		for (let filed in req.body) {
			req.body[filed] !== '' ? (query[filed] = req.body[filed]) : null;
		}

		//동물 종류 필터
		if (query['community_animal_type'] != undefined) {
			// query['community_animal_type'] = req.body.community_animal_type;
			let community_animal_type =
				typeof req.body.community_animal_type == 'string'
					? req.body.community_animal_type.replace(/[\[\]\"]/g, '').split(',')
					: req.body.community_animal_type;

			if (community_animal_type.length == 3) {
				delete query['community_animal_type'];
			} else if (community_animal_type.length == 1 && community_animal_type[0] != 'etc') {
				query['community_animal_type'] = community_animal_type[0];
			} else if (community_animal_type.length == 2 && community_animal_type.filter(x => !['dog', 'etc'].includes(x)).length == 0) {
				query['community_animal_type'] = {$ne: 'cat'};
			} else if (community_animal_type.length == 2 && community_animal_type.filter(x => !['cat', 'etc'].includes(x)).length == 0) {
				query['community_animal_type'] = {$ne: 'dog'};
			} else if (community_animal_type.length == 1 && community_animal_type[0] == 'etc') {
				query['community_animal_type'] = {$nin: ['dog', 'cat']};
			} else if (community_animal_type.length == 2 && community_animal_type.filter(x => !['dog', 'cat'].includes(x)).length == 0) {
				query['community_animal_type'] = {$in: community_animal_type};
			} else if (community_animal_type.filter(x => !['dog', 'cat', 'etc'].includes(x)).length == 0) {
			}
		}

		//시 정보 불러오기
		if (query['interests_city'] != undefined) {
			//db와 사용자 입력값이 다르기 때문에 addressMaching 함수로 필터시킴
			city = await addressMaching(query['interests_city']);
			query['community_interests.interests_location.city'] = city;
			//쿼리문에서 불필요하게 조건문이 형성되므로 해당 필드는 삭제
			delete query['interests_city'];
		}
		//구,군 정보 불러오기
		if (query['interests_district'] != undefined) {
			district = query['interests_district'];
			query['community_interests.interests_location.district'] = district;
			//쿼리문에서 불필요하게 조건문이 형성되므로 해당 필드는 삭제
			delete query['interests_district'];
		}

		//관심도에 따른 리스트 형성 (관심도는 정해져 있지 않기 때문에 공통코드에서 불러와 확인)
		let commoncode_condition = {};
		//공통코드 쿼리 조건
		commoncode_condition['common_code_c_name'] = 'communityobjects';
		commoncode_condition['common_code_f_name'] = 'community_interests';
		commoncode_condition['common_code_category'] = 'topic';
		commonCodeInterestList = await CommonCode.model.find(commoncode_condition, {common_code_value: 1, _id: 0}).lean();
		let interestList = Array();
		let ineterestField = '';
		let ineterestValue = '';
		for (let i = 0; i < commonCodeInterestList.length; i++) {
			ineterestField = '';
			ineterestField = commonCodeInterestList[i].common_code_value;
			ineterestFieldComplete = 'community_interests.' + commonCodeInterestList[i].common_code_value;

			//쿼리 조건 형성을 위해 셋팅
			if (req.body[ineterestField] != undefined) {
				interestList =
					typeof req.body[ineterestField] == 'string' ? req.body[ineterestField].replace(/[\[\]\"]/g, '').split(',') : req.body[ineterestField];
				//쿼리문에서 불필요하게 조건문이 형성되므로 해당 필드는 삭제
				delete query[ineterestField];
				//실제 필요한 필드 형성 (아래 형성된 필드가 실제 DB와 매칭됨)
				query[ineterestFieldComplete] = {$in: interestList};
			}
		}

		query['community_type'] = 'review';
		console.log('query=>', query);
		console.time();
		community = await Community.model
			.find(query, {community_is_temporary: 0, type: 0})
			.populate('community_writer_id', 'user_nickname _id')
			.where('community_is_delete')
			.ne(true)
			.skip(skip)
			.limit(limit)
			.sort('-_id')
			.lean();
		console.timeEnd();
		total_count = await Community.model.find(query).where('community_is_delete').ne(true).count().lean();

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
			total_count: total_count,
			msg: community,
			// msg: '',
		});
	});
});

//특정 유저가 작성한 커뮤니티를 불러옴
router.post('/getCommunityListByUserId', (req, res) => {
	controller(req, res, async () => {
		const page = parseInt(req.body.page) * 1 || 1;
		const limit = parseInt(req.body.limit) * 1 || 30;
		const skip = (page - 1) * limit;

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
				(query.equalscommunity_avatar_id = req.body.userobject_id), (query.community_type = req.body.community_type);
			}
		} else {
			if (req.body.community_type == 'all') {
				query.community_writer_id = req.body.userobject_id;
			} else {
				query.community_writer_id = req.body.userobject_id;
				query.community_type = req.body.community_type;
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
			.skip(skip)
			.limit(limit)
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
		const page = parseInt(req.body.page) * 1 || 1;
		const limit = parseInt(req.body.limit) * 1 || 30;
		const skip = (page - 1) * limit;

		communityList = await Community.model
			.find({
				$or: [{community_title: {$regex: keyword}}, {community_content_without_html: {$regex: keyword}}],
			})
			.populate('community_writer_id')
			.where('community_is_delete')
			.ne(true)
			.skip(skip)
			.limit(limit)
			.lean();

		if (communityList.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		//로그인 상태에서만 is_favorite 표출
		if (req.session.loginUser) {
			let favoritedCommunityList = [];
			let followList = [];
			let likedCommunityList = [];

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
			//null일 경우 is_follow를 추가하지 않고 그냥 넘긴다. (사용자 null처리 로직)
			communityList = communityList.map(communityList => {
				if (communityList.community_writer_id == null || communityList.community_writer_id == undefined) {
					return {...communityList};
				} else if (followList.find(follow => follow.follower_id.equals(communityList.community_writer_id._id))) {
					return {...communityList, is_follow: true};
				} else {
					return {...communityList, is_follow: false};
				}
			});

			likedCommunityList = await LikeEtc.model.find({like_etc_user_id: req.session.loginUser, like_etc_is_delete: false}).lean();
			communityList = communityList.map(communityList => {
				if (likedCommunityList.find(likedCommunity => likedCommunity.like_etc_post_id == communityList._id)) {
					return {...communityList, is_like: true};
				} else {
					return {...communityList, is_like: false};
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

//커뮤니티 페이지 번호 클릭 형식 페이징 불러옴(필터 적용)
router.post('/getCommunityListFreeByPageNumber', (req, res) => {
	controller(req, res, async () => {
		const page = parseInt(req.body.page) * 1 || 1;
		const limit = parseInt(req.body.limit) * 1 || 10;
		const skip = (page - 1) * limit;
		let start_id;
		let end_id;
		let oriList;
		let resultList;
		let query_id = {}; //자유게시판 상세 페이징 처리 용
		let query_list = {}; //자유게시판 겉 페이징 처리 용
		let query_list_count = {}; //자유게시판 겉 페이징 total count 처리 용

		//커뮤니티 타입 정의
		query_id['community_type'] = 'free';
		query_list['community_type'] = 'free';
		query_list_count['community_type'] = 'free';

		//상세페이지의 하단 커뮤니티 리스트 페이징에는 target_object_id가 추가 (상세 페이지 ID = target_object_id)
		if (req.body.target_object_id != undefined) {
			query_id['_id'] = {$lte: mongoose.Types.ObjectId(req.body.target_object_id)};
		}

		//자유게시글 타입은 배열 형식이라서 별도의 처리 필요.
		if (req.body.community_free_type != undefined) {
			let array_community_free_type = Array();
			let community_free_type =
				typeof req.body.community_free_type == 'string'
					? req.body.community_free_type.replace(/[\[\]\"]/g, '').split(',')
					: req.body.community_free_type;
			for (let p = 0; p < community_free_type.length; p++) {
				array_community_free_type.push(community_free_type[p]);
			}
			query_id['community_free_type'] = {$in: array_community_free_type};
			query_list['community_free_type'] = {$in: array_community_free_type};
			query_list_count['community_free_type'] = {$in: array_community_free_type};
		}

		//페이지별 게시물에 해당되는 id 리스트를 구한다.
		oriList = await Community.model.find(query_id, {_id: 1}).skip(skip).limit(limit).where('community_is_delete').ne(true).sort('-_id').lean();
		start_id = oriList[0]._id;
		end_id = oriList[oriList.length - 1]._id;

		//시작과 끝 _id 값을 구한다.
		query_list['$and'] = [{_id: {$gte: end_id}}, {_id: {$lte: start_id}}];
		community = await Community.model
			.find(query_list, {
				_id: 1,
				community_title: 1,
				community_date: 1,
				community_is_attached_file: 1,
				community_type: 1,
				community_free_type: 1,
				community_comment_count: 1,
			})
			.where('community_is_delete')
			.limit(limit)
			.ne(true)
			.sort('-_id')
			.lean();

		//total_count는 자유게시판 상세 페이징 처리용과 일반 페이징용을 구분해서 구한다.
		if (req.body.target_object_id != undefined) {
			total_count = await Community.model.find(query_id, {_id: 1}).where('community_is_delete').ne(true).count().lean();
		} else {
			total_count = await Community.model.find(query_list_count, {_id: 1}).where('community_is_delete').ne(true).count().lean();
		}

		if (!community) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({
			status: 200,
			total_count: total_count,
			msg: community,
		});
	});
});

//관련 리뷰 더보기 5개
router.post('/getReviewListMore', (req, res) => {
	controller(req, res, async () => {
		let community;
		let query = {};
		let city = '';
		let district = '';

		for (let filed in req.body) {
			req.body[filed] !== '' ? (query[filed] = req.body[filed]) : null;
		}

		//관련 더보기 조건
		//1. 최신글(community_date 역순)
		//2. 관심도 일치 여부를 넣고
		//3. 5개가 안된다면 랜덤으로 나머지 개수를 채워 5개를 맞추도록 함.

		//관심도에 따른 리스트 형성 (관심도는 정해져 있지 않기 때문에 공통코드에서 불러와 확인)
		let commoncode_condition = {};
		//공통코드 쿼리 조건
		commoncode_condition['common_code_c_name'] = 'communityobjects';
		commoncode_condition['common_code_f_name'] = 'community_interests';
		commoncode_condition['common_code_category'] = 'topic';
		commonCodeInterestList = await CommonCode.model.find(commoncode_condition, {common_code_value: 1, _id: 0}).lean();
		let interestList = Array();
		let ineterestField = '';
		let ineterestValue = '';
		for (let i = 0; i < commonCodeInterestList.length; i++) {
			ineterestField = '';
			ineterestField = commonCodeInterestList[i].common_code_value;
			ineterestFieldComplete = 'community_interests.' + commonCodeInterestList[i].common_code_value;

			//쿼리 조건 형성을 위해 셋팅
			if (req.body[ineterestField] != undefined) {
				interestList =
					typeof req.body[ineterestField] == 'string' ? req.body[ineterestField].replace(/[\[\]\"]/g, '').split(',') : req.body[ineterestField];
				//쿼리문에서 불필요하게 조건문이 형성되므로 해당 필드는 삭제
				delete query[ineterestField];
				//실제 필요한 필드 형성 (아래 형성된 필드가 실제 DB와 매칭됨)
				query[ineterestFieldComplete] = {$in: interestList};
			}
		}

		if (query['interests_city'] != undefined) {
			query['community_interests.interests_location.city'] = query['interests_city'];
			delete query['interests_city'];
			if (query['interests_district'] != undefined) {
				query['community_interests.interests_location.district'] = query['interests_district'];
			}
		}

		query['community_type'] = 'review';
		console.log('query=>', query);
		let communiuty_more_list1;
		let communiuty_more_list2;
		let communiuty_more_list3;
		console.time();
		community = await Community.model
			.find(query, {community_is_temporary: 0, type: 0})
			.populate('community_writer_id', 'user_nickname _id')
			.where('community_is_delete')
			.ne(true)
			.where('_id')
			.ne(query['community_object_id'])
			.sort('-community_date')
			.lean();

		//step 1단계 : 원래 필터 조건이 5개가 안될 경우 지역 필터만 적용
		if (community.length < 5) {
			detail_query = {};
			if (query['community_interests.interests_location.city'] != undefined) {
				community2 = await Community.model
					.find(
						{'community_interests.interests_location.city': query['community_interests.interests_location.city']},
						{community_is_temporary: 0, type: 0},
					)
					.populate('community_writer_id', 'user_nickname _id')
					.where('community_type', 'review')
					.where('community_is_delete')
					.ne(true)
					.where('_id')
					.ne(query['community_object_id'])
					.sort('-community_date')
					.lean();
				// console.log('community2=>', community2);
			}
			communiuty_more_list1 = community.concat(community2);
			//step 2단계 : 지역 필터 적용 후 5개가 안될 경우 지역 필터를 제외한 관심도 적용
			if (communiuty_more_list1.length < 5) {
				let community3 = query;
				delete community3['community_interests.interests_location.city'];

				community3 = await Community.model
					.find({community3}, {community_is_temporary: 0, type: 0})
					.populate('community_writer_id', 'user_nickname _id')
					.where('community_type', 'review')
					.where('community_is_delete')
					.ne(true)
					.where('_id')
					.ne(query['community_object_id'])
					.sort('-community_date')
					.lean();
				communiuty_more_list = community.concat(community2);
			}
			//step 3단계 : 관심도 적용 후 5개가 안될 경우 랜덤 적용
			if (communiuty_more_list.length < 5) {
				let community3 = query;
				console.log('community3=>', community3);
				delete community3['community_interests.interests_location.city'];

				community2 = await Community.model
					.find({community3}, {community_is_temporary: 0, type: 0})
					.populate('community_writer_id', 'user_nickname _id')
					.where('community_type', 'review')
					.where('community_is_delete')
					.ne(true)
					.where('_id')
					.ne(query['community_object_id'])
					.sort('-community_date')
					.lean();
			}
		}

		console.timeEnd();

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
			msg: community,
			// msg: '',
		});
	});
});
module.exports = router;
