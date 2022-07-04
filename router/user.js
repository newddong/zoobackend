const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Feed = require('../schema/feed');
const PetType = require('../schema/pettype');
const uploadS3 = require('../common/uploadS3');
const Follow = require('../schema/follow');
const Address = require('../schema/address');
const MemoBox = require('../schema/memobox');
const Notice = require('../schema/notice');
const NoticeUser = require('../schema/noticeuser');
const FavoriteEtc = require('../schema/favoriteetc');
const ShelterProtect = require('../schema/shelterProtectAnimal');
const Community = require('../schema/community');
const ProtectRequest = require('../schema/protectrequest');

const {controller, controllerLoggedIn} = require('./controller');
const {
	ALREADY_LOGIN,
	USER_NOT_FOUND,
	USER_PASSWORD_NOT_VALID,
	LOGOUT_FAILED,
	LOGOUT_SUCCESS,
	USER_NOT_VALID,
	ALERT_DUPLICATE_NICKNAME,
	ALERT_NOT_VALID_USEROBJECT_ID,
	ALERT_NOT_VALID_OBJECT_ID,
	ALERT_NOt_VALID_TARGER_OBJECT_ID,
	ALERT_NO_RESULT,
	USER_NOT_VALID_TYPE,
} = require('./constants');
const {nicknameDuplicationCheck} = require('./utilfunction');
const session = require('express-session');
const mongoose = require('mongoose');
const axios = require('axios');

//로그인
router.post('/userLogin', (req, res) => {
	controller(req, res, async () => {
		// if (req.session?.loginUser) {
		// 	res.json({status: 200, msg: {
		// 		user_nickname: '이미 로그인된 유저입니다.'
		// 	}});
		// 	return;
		// }

		let loginUser = await User.model.findOne().where('user_phone_number').equals(req.body.login_id);

		if (!loginUser) {
			res.json({status: 404, msg: USER_NOT_FOUND});
			return;
		}
		let isValidPassword = loginUser.user_password == req.body.login_password;
		if (!isValidPassword) {
			res.json({status: 404, msg: USER_PASSWORD_NOT_VALID});
			return;
		}

		req.session.loginUser = loginUser._id;
		req.session.user_type = loginUser.user_type;
		req.session.user_nickname = loginUser.user_nickname;
		res.json({status: 200, msg: loginUser});
	});
});

//로그아웃
router.post('/userLogout', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		try {
			req.session.destroy();
			//res.status(200);
			res.json({status: 200, msg: LOGOUT_SUCCESS});
		} catch (err) {
			//res.status(200);
			res.json({status: 500, msg: LOGOUT_FAILED});
		}
	});
});

//유저 생성
router.post('/assignUser', uploadS3.single('user_profile_uri'), (req, res) => {
	controller(req, res, async () => {
		const duplicateNickname = await User.model.findOne({user_nickname: req.body.user_nickname});
		if (duplicateNickname != null && duplicateNickname.user_type != 'pet') {
			// res.status(400);
			res.json({status: 200, msg: ALERT_DUPLICATE_NICKNAME});
			return;
		}

		const user = await User.makeNewdoc({
			user_agreement: typeof req.body.user_agreement == 'string' ? JSON.parse(req.body.user_agreement) : req.body.user_agreement,
			user_address: typeof req.body.user_address == 'string' ? JSON.parse(req.body.user_address) : req.body.user_address,
			user_mobile_company: req.body.user_mobile_company,
			user_name: req.body.user_name,
			user_password: req.body.user_password,
			user_phone_number: req.body.user_phone_number,
			user_nickname: req.body.user_nickname,
			user_profile_uri: req.file?.location,
			user_is_verified_phone_number: true,
			user_interests: new Object(),
		});
		const newUser = await user.save();

		res.json({status: 200, msg: newUser});
	});
});

//반려동물 생성
router.post('/assignPet', uploadS3.single('user_profile_uri'), (req, res) => {
	controller(req, res, async () => {
		const pet = await User.makeNewdoc({
			pet_family: [req.body.userobject_id],
			pet_birthday: req.body.pet_birthday,
			pet_is_temp_protection: req.body.pet_is_temp_protection,
			pet_neutralization: req.body.pet_neutralization,
			pet_sex: req.body.pet_sex,
			pet_species: req.body.pet_species,
			pet_species_detail: req.body.pet_species_detail,
			pet_status: req.body.pet_status,
			pet_weight: req.body.pet_weight,
			user_nickname: req.body.user_nickname,
			user_profile_uri: req.file?.location,
			user_type: 'pet',
			user_interests: new Object(),
		});

		if (req.body.protect_animal_status) {
			const shelterProtectAnimal = await ShelterProtect.model.findById(req.body.protect_act_protect_animal_id).exec();
			shelterProtectAnimal.protect_animal_status = req.body.protect_animal_status;
			const result = await shelterProtectAnimal.save();
		}

		if (req.body.user_profile) {
			pet.user_profile_uri = req.body.user_profile;
		}

		const newPet = await pet.save();
		const petOwner = await User.model.findById(req.body.userobject_id).exec();
		petOwner.user_my_pets.push(newPet._id);
		await petOwner.save();

		res.json({status: 200, msg: newPet});
	});
});

//보호소 생성
router.post('/assignShelter', uploadS3.single('user_profile_uri'), (req, res) => {
	controller(req, res, async () => {
		const shelter = await User.makeNewdoc({
			shelter_address: typeof req.body.shelter_address == 'string' ? JSON.parse(req.body.shelter_address) : req.body.shelter_address,
			shelter_delegate_contact_number: req.body.shelter_delegate_contact_number,
			user_phone_number: req.body.shelter_delegate_contact_number, //대표번호를 자동으로 로그인용 휴대폰 번호로 등록
			shelter_foundation_date: req.body.shelter_foundation_date,
			shelter_homepage: req.body.shelter_homepage,
			shelter_name: req.body.user_nickname,
			user_nickname: req.body.user_nickname, //보호소 이름을 닉네임으로 설정
			user_name: req.body.user_nickname, //유저실명란도 보호소 이름으로 설정
			shelter_type: req.body.shelter_type,
			user_email: req.body.user_email,
			user_password: req.body.user_password,
			user_profile_uri: req.file?.location,
			user_type: 'shelter',
			user_interests: new Object(),
		});
		const newShelter = await shelter.save();
		res.json({status: 200, msg: newShelter});
	});
});

//보호소 코드 체크
router.post('/checkShelterCode', (req, res) => {
	controller(req, res, async () => {
		let isValidCheckCode = 'ABCDE' == req.body.shelter_code;
		res.json({status: 200, msg: isValidCheckCode});
	});
});

//유저 프로필
router.post('/getUserProfile', (req, res) => {
	controller(req, res, async () => {
		const userInfo = await User.model
			.findById(req.body.userobject_id)
			.select('-user_password')
			.populate('user_my_pets')
			.populate('pet_family')
			.lean();

		if (!userInfo) {
			//res.status(404);
			res.json({status: 404, msg: USER_NOT_FOUND});
			return;
		}

		//사용자 업로드,팔로워,팔로잉 개수 카운트
		let feedCount = await Feed.model
			.find({
				$and: [{feed_type: 'feed'}, {feed_avatar_id: req.body.userobject_id}],
			})
			.where('feed_is_delete')
			.ne(true)
			.count()
			.lean();
		let report_missingCount = await Feed.model
			.find({
				$and: [{feed_type: {$in: ['report', 'missing']}}, {feed_writer_id: req.body.userobject_id}],
			})
			.where('feed_is_delete')
			.ne(true)
			.count()
			.lean();

		let protectRequestCount = await ProtectRequest.model
			.find({protect_request_writer_id: mongoose.Types.ObjectId(req.body.userobject_id)})
			.where('protect_request_is_delete')
			.ne(true)
			.count()
			.lean();

		let communityCount = await Community.model
			.find({community_writer_id: req.body.userobject_id})
			.where('community_is_delete')
			.ne(true)
			.count()
			.lean();
		let totalCount = feedCount + report_missingCount + protectRequestCount + communityCount;

		let followList = await Follow.model
			.find({follow_id: req.body.userobject_id, follow_is_delete: false})
			.populate({path: 'follower_id', select: '_id'})
			.lean();

		let followerList = await Follow.model
			.find({follower_id: req.body.userobject_id, follow_is_delete: false})
			.populate({path: 'follow_id', select: '_id'})
			.lean();
		let followCount = 0;
		let follwerCount = 0;

		for (let k = 0; k < followList.length; k++) {
			if (followList[k].follower_id != null) {
				followCount++;
			}
		}

		for (let i = 0; i < followerList.length; i++) {
			if (followerList[i].follow_id != null) {
				follwerCount++;
			}
		}
		//게시물 업로드 개수, 팔로워 개수, 팔로잉 개수 사용자 컬렉션에 최종 업로드
		let countUpdate = await User.model
			.findOneAndUpdate(
				{
					_id: req.body.userobject_id,
				},
				{
					$set: {
						user_upload_count: totalCount,
						user_follow_count: followCount,
						user_follower_count: follwerCount,
					},
					$currentDate: {feed_update_date: true},
				},
				{new: true, upsert: true},
			)
			.lean();

		let feedList = [];
		if (userInfo.user_type == 'pet') {
			feedList = await Feed.model.find({feed_avatar_id: userInfo._id}).where('feed_is_delete').ne(true).limit(9999).sort('-_id').lean();
		} else {
			feedList = await Feed.model.find({feed_writer_id: userInfo._id}).where('feed_is_delete').ne(true).limit(9999).sort('-_id').lean();
		}

		let follow = false;
		let is_favorite = false;
		let favorite;
		if (req.session && req.session.loginUser) {
			follow = await Follow.model.findOne({follow_id: req.session.loginUser, follower_id: userInfo._id}).lean();
			favorite = await FavoriteEtc.model.findOne({favorite_etc_user_id: req.session.loginUser, favorite_etc_target_object_id: userInfo._id}).lean();
		}
		follow = follow != null && !follow.follow_is_delete;
		is_favorite = favorite != null && !favorite.favorite_etc_is_delete;

		const profile = {
			...userInfo,
			feedList: feedList,
			is_follow: follow,
			is_favorite: is_favorite,
		};

		res.json({status: 200, msg: profile});
	});
});

//유저 닉네임 중복체크
router.post('/nicknameDuplicationCheck', (req, res) => {
	controller(req, res, async () => {
		const duplicateUser = await User.model.findOne({user_nickname: req.body.user_nickname});

		let isDuplicate = duplicateUser && duplicateUser.user_type != 'pet';

		if (req.session && req.session.loginUser) {
			isDuplicate = isDuplicate && !duplicateUser._id.equals(req.session.loginUser);
		}
		res.json({status: 200, msg: isDuplicate});
	});
});

//유저 정보를 수정
router.post('/updateUserInformation', uploadS3.single('user_profile_uri'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let userInfo = await User.model.findById(req.body.userobject_id).exec();
		if (userInfo == null) {
			//res.status(400);
			res.json({status: 400, msg: ALERT_NOT_VALID_USEROBJECT_ID});
			return;
		}

		const duplicate = await User.model.findOne({user_nickname: req.body.user_nickname});

		let isDuplicate = userInfo.user_type != 'pet' && duplicate && !userInfo._id.equals(duplicate._id);
		if (isDuplicate) {
			res.json({status: 400, msg: ALERT_DUPLICATE_NICKNAME});
			return;
		}

		userInfo.user_nickname = req.body.user_nickname;

		if (req.file) {
			userInfo.user_profile_uri = req.file?.location;
		}

		userInfo = await userInfo.save();

		//res.status(200);
		res.json({status: 200, msg: userInfo});
	});
});

//유저 상세 정보를 수정
router.post('/updateUserDetailInformation', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let userInfo = await User.model.findById(req.session.loginUser).exec();
		if (userInfo == null) {
			//res.status(400);
			res.json({status: 400, msg: ALERT_NOT_VALID_USEROBJECT_ID});
			return;
		}
		// let user_interests = typeof req.body.user_interests == 'string' ? JSON.parse('[' + req.body.user_interests + ']') : req.body.user_interests;
		let user_interests = typeof req.body.user_interests == 'string' ? JSON.parse(req.body.user_interests) : req.body.user_interests;

		let user_address = typeof req.body.user_address == 'string' ? JSON.parse(req.body.user_address) : req.body.user_address;

		if (user_interests) {
			userInfo.user_interests = user_interests;
		}
		if (user_address) {
			userInfo.user_address = user_address;
		}

		userInfo = await userInfo.save();
		res.json({status: 200, msg: userInfo});
	});
});

//반려동물 상세 정보를 수정
router.post('/updatePetDetailInformation', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		const fields = Object.keys(req.body);
		const query = {};

		//업데이트 진행되는 필드만 가져옴
		for (let i = 0; i < fields.length; i++) {
			query[fields[i]] = Object.values(req.body)[i];
		}

		//업데이트 날짜에 해당되는 필드는 항상 별도로 추가 입력 필요
		query.user_update_date = Date.now();

		//데이터가 들어온 필드만 업데이트를 진행
		const result = await User.model
			.findByIdAndUpdate(
				{_id: req.body.userobject_id},
				{
					$set: query,
				},
				{new: true},
			)
			.lean();

		if (!result) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		if (query.user_is_delete != undefined) {
			//해당 반려동물을 가지고 있는 모든 주인 계정에서 반려동물을 삭제한다.
			await User.model.updateMany({}, {$pull: {user_my_pets: mongoose.Types.ObjectId(req.body.userobject_id)}}).lean();
		}

		res.json({status: 200, msg: result});
	});
});

//반려동물의 가족계정에 유저를 추가
router.post('/addUserToFamily', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let pet = await User.model.findById(req.body.userobject_id).exec();
		if (!pet) {
			res.json({status: 404, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}
		if (pet.user_type != 'pet') {
			res.json({status: 400, msg: '반려동물을 userobject_id의 대상으로 선택하세요'});
			return;
		}

		let targetUser = await User.model.findById(req.body.family_userobject_id).exec();
		if (!targetUser) {
			res.json({status: 404, msg: ALERT_NOt_VALID_TARGER_OBJECT_ID});
			return;
		}
		if (targetUser.user_type == 'pet') {
			res.json({status: 400, msg: '반려동물 끼리는 가족이 될 수 없습니다.'});
			return;
		}

		let containFamily = pet.pet_family.some(v => v.equals(req.body.family_userobject_id));
		if (containFamily) {
			res.json({status: 400, msg: USER_NOT_VALID});
			return;
		}

		pet.pet_family.push(targetUser._id);
		pet.user_interests = new Object();
		pet = await pet.save();
		targetUser.user_my_pets.push(pet._id);
		targetUser.user_interests = new Object();
		targetUser = await targetUser.save();

		//res.status(200);
		res.json({status: 200, pet: pet, targetUser: targetUser});
	});
});

//유저의 패스워드를 변경
router.post('/changeUserPassword', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let user = await User.model.findById(req.session.loginUser).exec();
		if (user.user_password != req.body.user_password) {
			//res.status(400);
			res.json({status: 400, msg: USER_PASSWORD_NOT_VALID});
			return;
		}
		user.user_password = req.body.new_user_password;
		await user.save();
		//res.status(200);
		res.json({status: 200, msg: user});
	});
});

//유저의 상세 정보를 조회
router.post('/getUserInfoById', (req, res) => {
	controller(req, res, async () => {
		let filter = {
			user_password: 0,
			user_agreement: 0,
		};
		let user = await User.model.findById(req.body.userobject_id).select(filter).lean();
		if (!user) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		switch (user.user_type) {
			case 'user':
			case 'shelter':
				user = await User.model.findById(user._id).populate('user_my_pets').lean();
				break;
			case 'pet':
				user = await User.model.findById(user._id).populate('pet_family').lean();
				break;
			default:
				break;
		}

		let follow = false;
		if (req.session && req.session.loginUser) {
			follow = await Follow.model.findOne({follow_id: user._id, follower_id: req.session.loginUser}).lean();
		}
		follow = follow != null && !follow.follow_is_delete;

		user = {...user, is_follow: follow};
		console.log('user=>', user);
		res.json({status: 200, msg: user});
	});
});

//유저 소개글 변경
router.post('/updateUserIntroduction', (req, res) => {
	controller(req, res, async () => {
		let user = await User.model.findById(req.body.userobject_id).exec();
		if (!user) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		user.user_introduction = req.body.user_introduction;
		await user.save();
		res.json({status: 200, msg: user});
	});
});

//보호소 상세 정보를 수정
router.post('/updateShelterDetailInformation', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let shelter = await User.model.findById(req.body.userobject_id).exec();
		if (!shelter) {
			res.json({status: 400, msg: ALERT_NOT_VALID_USEROBJECT_ID});
			return;
		}

		// shelter.shelter_name = req.body.shelter_name;
		shelter.user_nickname = req.body.user_nickname;
		shelter.shelter_address = typeof req.body.shelter_address == 'string' ? JSON.parse(req.body.shelter_address) : req.body.shelter_address;
		shelter.shelter_delegate_contact_number = req.body.shelter_delegate_contact_number;
		shelter.user_email = req.body.user_email;
		shelter.shelter_homepage = req.body.shelter_homepage;
		shelter.shelter_foundation_date = req.body.shelter_foundation_date;
		shelter.user_interests = new Object();
		await shelter.save();
		res.json({status: 200, msg: shelter});
	});
});

//유저 계정 검색 '/'가 입력되면 'user/pet'으로 검색됨
router.post('/getUserListByNickname', (req, res) => {
	controller(req, res, async () => {
		let nickname = req.body.user_nickname;
		let requestnum = req.body.request_number;
		let userType = req.body.user_type;
		let userName = '';
		let petName = '';
		let userList = [];

		if (nickname.includes('/')) {
			let namearray = nickname.split('/');
			petName = namearray[0];
			userName = namearray[1];
			if (userType != '') {
				userList = await User.model
					.find({user_nickname: {$regex: petName}})
					.where('user_type')
					.equals(userType)
					.populate({path: 'pet_family', match: {user_nickname: {$regex: userName}}})
					.limit(requestnum)
					.lean();
			} else {
				userList = await User.model
					.find({user_nickname: {$regex: petName}})
					.populate({path: 'pet_family', match: {user_nickname: {$regex: userName}}})
					.limit(requestnum)
					.lean();
			}
			userList = userList.filter(v => v.pet_family.length > 0);
		} else {
			if (userType != '') {
				userList = await User.model
					.find({user_nickname: {$regex: nickname}})
					.where('user_type')
					.equals(userType)
					.limit(requestnum)
					.lean();
			} else {
				userList = await User.model
					.find({user_nickname: {$regex: nickname}})
					.limit(requestnum)
					.lean();
			}
		}
		if (userList.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		} else {
			let follower_id_array = new Array();
			//결과 리스트의 _id를 가져와서 follow_id 리스트를 만든다.
			for (let k = 0; k < userList.length; k++) {
				follower_id_array.push(JSON.stringify(userList[k]._id).replace(/[\"]/gi, ''));
			}
			//팔로워 컬렉션에서 내가 팔로워이고 팔로우 array에 속한 리스트를 가져옴 (이 사람들이 처음 검색 결과에서 내가 팔로우 한 사람들임)
			follower_list = await Follow.model
				.find({})
				.where('follow_id')
				.equals(req.session.loginUser)
				.where('follower_id')
				.in(follower_id_array)
				.where('follow_is_delete')
				.ne(true)
				.select({follower_id: 1, _id: 0});

			//특수문자 제외하고 Array로 생성
			let follower_list_result = new Array();
			for (let z = 0; z < follower_list.length; z++) {
				follower_list_result.push(JSON.stringify(follower_list[z].follower_id).replace(/[\"]/gi, ''));
			}

			//검색 결과에서 팔로우에 해당되는 인원들에 대해 follow 속성을 붙여서 true, false 표기
			for (let g = 0; g < userList.length; g++) {
				if (follower_list_result.some(v => v == JSON.stringify(userList[g]._id).replace(/[\"]/gi, ''))) {
					userList[g].follow = true;
				} else userList[g].follow = false;
			}
		}
		res.json({status: 200, msg: userList});
	});
});

//가족 계정에서 삭제
router.post('/removeUserFromFamily', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let targetUser = await User.model.findById(req.body.target_userobject_id).exec();
		if (!targetUser) {
			res.json({status: 404, msg: USER_NOT_FOUND});
			return;
		}

		let pet = await User.model.findById(req.body.pet_userobject_id).exec();
		if (!pet) {
			res.json({status: 404, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}

		targetUser.user_my_pets = targetUser.user_my_pets.filter(myPet => {
			// console.log('myPet',myPet);
			// console.log('petid',pet._id);
			// console.log(myPet.equals(pet._id));
			return !myPet.equals(pet._id);
		});
		pet.pet_family = pet.pet_family.filter(family => {
			// console.log('family',family);
			// console.log('targetUserId',targetUser._id);
			// console.log(family.equals(targetUser._id));
			return !family.equals(targetUser._id);
		});

		targetUser.user_interests = new Object();
		pet.user_interests = new Object();
		targetUser = await targetUser.save();
		pet = await pet.save();

		res.json({status: 200, msg: {user: targetUser, pet: pet}});
	});
});

//동물의 종류 코드를 받아온다.
router.post('/getPettypes', (req, res) => {
	controller(req, res, async () => {
		let codes = await PetType.model.find({}).exec();
		res.json({status: 200, msg: codes});
	});
});

//유저를 팔로우한다.
router.post('/followUser', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let targetUser = await User.model.findById(req.body.follow_userobject_id).exec();
		if (!targetUser) {
			res.json({status: 403, msg: '대상 유저가 존재하지 않습니다.'});
			return;
		}

		let follow = await Follow.model
			.findOneAndUpdate(
				{follow_id: req.session.loginUser, follower_id: targetUser._id},
				{$set: {follow_id: req.session.loginUser, follower_id: targetUser._id, follow_is_delete: false}, $currentDate: {follow_update_date: true}},
				{new: true, upsert: true},
			)
			.lean();

		//기존 팔로우, 팔로워 데이터를 증가하는 것이 아닌 팔로우, 팔로워 정보를 변경할때 FollowObject를 카운트한 후 해당 갯수를 넣는 방식으로 변경
		//상대방 계정 팔로우, 팔로워 업데이트 하기
		let user_follow_count = await Follow.model
			.find({follow_id: mongoose.Types.ObjectId(req.body.follow_userobject_id)})
			.where('follow_is_delete')
			.ne(true)
			.count()
			.lean();
		let user_follower_count = await Follow.model
			.find({follower_id: mongoose.Types.ObjectId(req.body.follow_userobject_id)})
			.where('follow_is_delete')
			.ne(true)
			.count()
			.lean();
		targetUser.user_follow_count = user_follow_count;
		targetUser.user_follower_count = user_follower_count;
		await targetUser.save();

		//로그인 계정 팔로우, 팔로워 업데이트 하기
		let loginUser_follow_count = await Follow.model
			.find({follow_id: mongoose.Types.ObjectId(req.session.loginUser)})
			.where('follow_is_delete')
			.ne(true)
			.count()
			.lean();
		let loginUser_follower_count = await Follow.model
			.find({follower_id: mongoose.Types.ObjectId(req.session.loginUser)})
			.where('follow_is_delete')
			.ne(true)
			.count()
			.lean();
		await User.model.findOneAndUpdate(
			{_id: req.session.loginUser},
			{$set: {user_follow_count: loginUser_follow_count, user_follower_count: loginUser_follower_count}},
		);

		// targetUser.user_follower_count++;
		// targetUser.user_interests = new Object();
		// await targetUser.save();
		// await User.model.findOneAndUpdate({_id: req.session.loginUser}, {$inc: {user_follow_count: 1}});

		//알림 내역에 댓글 관련 insert
		//알림 내역 중 팔로우 알림 'true' 여부 확인
		let checkNotice = await Notice.model.findOne({notice_user_id: req.body.follow_userobject_id});
		if (checkNotice != null && checkNotice.notice_tag_follower) {
			let select_opponent = await User.model.findById(req.body.follow_userobject_id);
			let select_loginUser = await User.model.findById(req.session.loginUser);
			let noticeUser = NoticeUser.makeNewdoc({
				notice_user_receive_id: req.body.follow_userobject_id,
				notice_user_related_id: req.session.loginUser,
				notice_user_contents_kor: select_loginUser.user_nickname + '님이 ' + select_opponent.user_nickname + '님을 팔로우 하기 시작했습니다.',
				target_object: follow._id,
				target_object_type: Follow.model.modelName,
				notice_user_date: Date.now(),
			});
			let resultNoticeUser = await noticeUser.save();
			let user = await User.model
				.findOneAndUpdate({_id: req.body.follow_userobject_id}, {$set: {user_alarm: true}}, {new: true, upsert: true, setDefaultsOnInsert: true})
				.lean();
		}

		res.json({status: 200, msg: follow});
	});
});

//유저를 팔로우 취소한다.
router.post('/unFollowUser', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let targetUser = await User.model.findById(req.body.follow_userobject_id).exec();
		if (!targetUser) {
			res.json({status: 403, msg: '대상 유저가 존재하지 않습니다.'});
			return;
		}

		let follow = await Follow.model
			.findOneAndUpdate(
				{follow_id: req.session.loginUser, follower_id: targetUser._id},
				{$set: {follow_is_delete: true}, $currentDate: {follow_update_date: true}},
				{new: true, upsert: false},
			)
			.lean();

		//기존 팔로우, 팔로워 데이터를 증가하는 것이 아닌 팔로우, 팔로워 정보를 변경할때 FollowObject를 카운트한 후 해당 갯수를 넣는 방식으로 변경
		//상대방 계정 팔로우, 팔로워 업데이트 하기
		let user_follow_count = await Follow.model
			.find({follow_id: mongoose.Types.ObjectId(req.body.follow_userobject_id)})
			.where('follow_is_delete')
			.ne(true)
			.count()
			.lean();
		let user_follower_count = await Follow.model
			.find({follower_id: mongoose.Types.ObjectId(req.body.follow_userobject_id)})
			.where('follow_is_delete')
			.ne(true)
			.count()
			.lean();
		targetUser.user_follow_count = user_follow_count;
		targetUser.user_follower_count = user_follower_count;
		await targetUser.save();

		//로그인 계정 팔로우, 팔로워 업데이트 하기
		let loginUser_follow_count = await Follow.model
			.find({follow_id: mongoose.Types.ObjectId(req.session.loginUser)})
			.where('follow_is_delete')
			.ne(true)
			.count()
			.lean();
		let loginUser_follower_count = await Follow.model
			.find({follower_id: mongoose.Types.ObjectId(req.session.loginUser)})
			.where('follow_is_delete')
			.ne(true)
			.count()
			.lean();
		await User.model.findOneAndUpdate(
			{_id: req.session.loginUser},
			{$set: {user_follow_count: loginUser_follow_count, user_follower_count: loginUser_follower_count}},
		);

		// targetUser.user_follower_count--;
		// targetUser.user_interests = new Object();
		// await targetUser.save();
		// await User.model.findOneAndUpdate({_id: req.session.loginUser}, {$inc: {user_follow_count: -1}});

		//알림 내역에 댓글 관련 insert
		//알림 내역 중 팔로우 알림 'true' 여부 확인
		let checkNotice = await Notice.model.findOne({notice_user_id: req.body.follow_userobject_id});
		if (checkNotice != null && checkNotice.notice_tag_follower) {
			let select_opponent = await User.model.findById(req.body.follow_userobject_id);
			let select_loginUser = await User.model.findById(req.session.loginUser);
			let noticeUser = NoticeUser.makeNewdoc({
				notice_user_receive_id: req.body.follow_userobject_id,
				notice_user_related_id: req.session.loginUser,
				notice_user_contents_kor: select_loginUser.user_nickname + '님이 ' + select_opponent.user_nickname + '님의 팔로우를 취소했습니다.',
				target_object: follow._id,
				target_object_type: Follow.model.modelName,
				notice_user_date: Date.now(),
			});
			let resultNoticeUser = await noticeUser.save();
			let user = await User.model
				.findOneAndUpdate({_id: req.body.follow_userobject_id}, {$set: {user_alarm: true}}, {new: true, upsert: true, setDefaultsOnInsert: true})
				.lean();
		}

		res.json({status: 200, msg: follow});
	});
});

//대상 유저가 팔로우 한 유저를 검색한다.
router.post('/getFollows', (req, res) => {
	controller(req, res, async () => {
		let targetUser = await User.model.findById(req.body.userobject_id).lean();
		let user_nickname = req.body.user_nickname;
		let userList = new Array();
		let userListTemp = new Array();

		if (!targetUser) {
			res.json({status: 403, msg: '대상 유저가 존재하지 않습니다.'});
			return;
		}
		let follow = await Follow.model
			.find({follow_id: targetUser._id, follow_is_delete: false})
			.populate({path: 'follow_id', select: 'user_type user_nickname user_introduction user_profile_uri'})
			.populate({path: 'follower_id', select: 'user_type user_nickname user_introduction user_profile_uri'})
			.lean();
		// if (user_nickname) {
		// 	userList = follow.filter(v => v.follow_id.user_nickname.includes(user_nickname));
		// 	res.json({status: 200, msg: userList});
		// } else res.json({status: 200, msg: follow});
		if (user_nickname) {
			userList = follow.filter(v => v.follower_id != null && v.follower_id.user_nickname.includes(user_nickname));
		} else {
			userList = follow;
		}

		let follower_id_array = new Array();
		//결과 리스트의 _id를 가져와서 follower_id_array 리스트를 만든다.
		for (let k = 0; k < userList.length; k++) {
			//팔로워 ID null 값 체크 (아이디 삭제 여부 판단을 위함)
			if (userList[k].follower_id != null) {
				userListTemp.push(userList[k]);
				follower_id_array.push(JSON.stringify(userList[k].follower_id._id).replace(/[\"]/gi, ''));
			}
		}
		userList = Array();
		//배열 복사 (하단에서 userList로 모두 쓰고 있어서 복사진행)
		userList = JSON.parse(JSON.stringify(userListTemp));

		//팔로우 컬렉션에서 팔로우이고 팔로우 array에 속한 리스트를 가져옴 (이 사람들이 처음 검색 결과에서 내가 팔로우 한 사람들임)
		follower_list = await Follow.model
			.find({})
			.where('follow_id')
			.equals(req.session.loginUser)
			.where('follower_id')
			.in(follower_id_array)
			.where('follow_is_delete')
			.ne(true)
			.select({follower_id: 1, _id: 0});

		//특수문자 제외하고 Array로 생성
		let follower_list_result = new Array();
		for (let z = 0; z < follower_list.length; z++) {
			follower_list_result.push(JSON.stringify(follower_list[z].follower_id).replace(/[\"]/gi, ''));
		}

		//검색 결과에서 팔로워에 해당되는 인원들에 대해 follow 속성을 붙여서 true, false 표기
		for (let g = 0; g < userList.length; g++) {
			if (follower_list_result.some(v => v == JSON.stringify(userList[g].follower_id._id).replace(/[\"]/gi, ''))) {
				userList[g].follow = true;
			} else userList[g].follow = false;
		}
		res.json({status: 200, msg: userList});
	});
});

//대상 유저를 팔로우 한 유저를 검색한다. (팔로워 리스트)
router.post('/getFollowers', (req, res) => {
	controller(req, res, async () => {
		let targetUser = await User.model.findById(req.body.userobject_id).lean();
		let user_nickname = req.body.user_nickname;
		let userList = new Array();
		let userListTemp = new Array();

		if (!targetUser) {
			res.json({status: 403, msg: '대상 유저가 존재하지 않습니다.'});
			return;
		}

		let follow = await Follow.model
			.find({follower_id: targetUser._id, follow_is_delete: false})
			.populate({path: 'follow_id', select: 'user_type user_nickname user_introduction user_profile_uri'})
			.populate({path: 'follower_id', select: 'user_type user_nickname user_introduction user_profile_uri'})
			.lean();
		// if (user_nickname) {
		// 	userList = follow.filter(v => v.follower_id.user_nickname.includes(user_nickname));
		// 	res.json({status: 200, msg: userList});
		// } else res.json({status: 200, msg: follow});

		if (user_nickname) {
			userList = follow.filter(v => v.follow_id != null && v.follow_id.user_nickname.includes(user_nickname));
		} else {
			userList = follow;
		}

		let follow_id_array = new Array();
		//검색 결과 리스트의 _id를 가져와서 follow_id 리스트를 만든다.
		for (let k = 0; k < userList.length; k++) {
			//팔로워 ID null 값 체크 (아이디 삭제 여부 판단을 위함)
			if (userList[k].follow_id != null) {
				userListTemp.push(userList[k]);
				follow_id_array.push(JSON.stringify(userList[k].follow_id._id).replace(/[\"]/gi, ''));
			}
		}

		userList = Array();
		//배열 복사 (하단에서 userList로 모두 쓰고 있어서 복사진행)
		userList = JSON.parse(JSON.stringify(userListTemp));

		//팔로우 컬렉션에서 내가 팔로우이고 위의 검색 결과에서 나온 리스트가 팔로워로 들어가 있는 리스트
		follower_list = await Follow.model
			.find({})
			.where('follow_id')
			.equals(req.session.loginUser)
			.where('follower_id')
			.in(follow_id_array)
			.where('follow_is_delete')
			.ne(true)
			.select({follower_id: 1, _id: 0});

		//특수문자 제외하고 Array로 생성
		let follower_list_result = new Array();
		for (let z = 0; z < follower_list.length; z++) {
			follower_list_result.push(JSON.stringify(follower_list[z].follower_id).replace(/[\"]/gi, ''));
		}

		//검색 결과에서 팔로우에 해당되는 인원들에 대해 follow 속성을 붙여서 true, false 표기
		for (let g = 0; g < userList.length; g++) {
			if (follower_list_result.some(v => v == JSON.stringify(userList[g].follow_id._id).replace(/[\"]/gi, ''))) {
				userList[g].follow = true;
			} else userList[g].follow = false;
		}
		res.json({status: 200, msg: userList});
	});
});

/**
 * 반려동물의 상태를 변경
 */
router.post('/setPetStatus', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let pet = await User.model.findById(req.body.userobject_id);
		console.log('pet=>', pet);
		if (!pet) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}
		if (pet.user_type != 'pet') {
			res.json({status: 400, msg: USER_NOT_VALID_TYPE});
			return;
		}
		const statusList = ['protect', 'adopt', 'companion'];
		const targetStatus = req.body.pet_status; //요청 상태
		if (!statusList.some(v => v == targetStatus)) {
			res.json({status: 400, msg: REQUEST_PARAMETER_NOT_VALID});
			return;
		}

		if (req.body.pet_adopter) {
			pet.pet_adopter = req.body.pet_adopter;
		}

		pet.pet_status = targetStatus;
		pet.user_interests = new Object();
		pet.user_update_date = Date.now();

		await pet.save();
		res.json({status: 200, msg: pet});
	});
});

//입양 및 임보로 승인된 동물중 반려 동물로 등록되지 않은 동물 목록 (로그인한 계정에 준함)
router.post('/getAnimalListNotRegisterWithCompanion', (req, res) => {
	controller(req, res, async () => {
		let shelterProtect = await ShelterProtect.model
			.find({
				$or: [
					{$and: [{protect_animal_protector_id: mongoose.Types.ObjectId(req.session.loginUser)}, {protect_animal_status: 'protect'}]},
					{$and: [{protect_animal_adoptor_id: mongoose.Types.ObjectId(req.session.loginUser)}, {protect_animal_status: 'adopt'}]},
				],
			})
			.exec();

		// let shelterProtect = await ShelterProtect.model.find({}).exec();

		res.json({status: 200, msg: shelterProtect});
	});
});

//쪽지 보내기
router.post('/createMemoBox', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let memoBox = await MemoBox.makeNewdoc({
			memobox_send_id: req.session.loginUser,
			memobox_receive_id: req.body.memobox_receive_id,
			memobox_contents: req.body.memobox_contents,
			memobox_date: Date.now(),
		});

		let resultMemoBox = await memoBox.save();

		//알림 내역에 쪽지 관련 insert
		let checkNotice = await Notice.model.findOne({notice_user_id: req.body.memobox_receive_id});
		if (checkNotice.notice_memobox != null && checkNotice.notice_memobox) {
			//게시글을 작성한 사용자와 좋아요를 남기는 사람이 같을 경우 알림 메세지를 담지 않는다.
			let select_opponent = await User.model.findById(req.body.memobox_receive_id);
			let select_loginUser = await User.model.findById(req.session.loginUser);
			let noticeUser = NoticeUser.makeNewdoc({
				notice_user_receive_id: req.body.memobox_receive_id,
				notice_user_related_id: req.session.loginUser,
				notice_user_contents_kor: select_loginUser.user_nickname + '님이 ' + select_opponent.user_nickname + '님에게 쪽지를 보냈습니다.',
				target_object: resultMemoBox._id,
				target_object_type: MemoBox.model.modelName,
				notice_user_date: Date.now(),
			});
			let resultNoticeUser = await noticeUser.save();
			let user = await User.model
				.findOneAndUpdate({_id: req.body.memobox_receive_id}, {$set: {user_alarm: true}}, {new: true, upsert: true, setDefaultsOnInsert: true})
				.lean();
		}

		res.json({status: 200, msg: resultMemoBox});
	});
});

//쪽지 삭제 (userObjectID로 삭제 - 상대방 사용자 대화 내용 모두 삭제)
router.post('/deleteMemoBoxWithUserObjectID', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		//배열로 받은 삭제할 유저들의 쪽지를 split 시킴
		objectArray = req.body.user_object_id.split(',');
		made_Array_objectid = new Array();

		//find 검색의 in 조건절로 넣어주기 위해 mongoose.Types.ObjectId 데이터 형의 Array를 만들어 준다.
		for (let i = 0; i < objectArray.length; i++) {
			made_Array_objectid.push(mongoose.Types.ObjectId(objectArray[i]));
		}

		//송수신중 로그인한 계정이 속해있고 삭제 대상의 유저 object에 속할 경우 업데이트 진행
		let resultMemoBox = await MemoBox.model
			.find({
				$or: [
					{
						$and: [{memobox_send_id: {$in: made_Array_objectid}}, {memobox_receive_id: mongoose.Types.ObjectId(req.session.loginUser)}],
					},
					{
						$and: [{memobox_send_id: mongoose.Types.ObjectId(req.session.loginUser)}, {memobox_receive_id: {$in: made_Array_objectid}}],
					},
				],
			})
			.populate({path: 'memobox_send_id', select: 'user_nickname user_profile_uri'})
			.populate({path: 'memobox_receive_id', select: 'user_nickname user_profile_uri'})
			.sort('-_id')
			.exec();

		tempObject = resultMemoBox;

		//삭제할 정보 구축
		let addDelete = Object();
		let memobox_delete_info = Array();
		addDelete.deleted_user = req.session.loginUser;
		addDelete.deleted_date = Date.now();
		memobox_delete_info.push(addDelete);

		//속성에 대입 및 업데이트
		for (let j = 0; j < tempObject.length; j++) {
			tempObject[j].memobox_delete_info = memobox_delete_info;
			tempObject[j].save();
		}

		res.json({status: 200, msg: tempObject});
	});
});

//쪽지 삭제 (memoboxObjectID로 삭제)
router.post('/deleteMemoBoxWithMemoBoxObjectID', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		//배열로 받은 memoboxObjectID를 split 시킴
		objectArray = req.body.memobox_object_id.split(',');
		made_Array_objectid = new Array();

		//find 검색의 in 조건절로 넣어주기 위해 mongoose.Types.ObjectId 데이터 형의 Array를 만들어 준다.
		for (let i = 0; i < objectArray.length; i++) {
			made_Array_objectid.push(mongoose.Types.ObjectId(objectArray[i]));
		}

		//송수신중 로그인한 계정이 속해있고 삭제 대상의 유저 object에 속할 경우 업데이트 진행
		let resultMemoBox = await MemoBox.model
			.find()
			.where('_id')
			.in(made_Array_objectid)
			.populate({path: 'memobox_send_id', select: 'user_nickname user_profile_uri'})
			.populate({path: 'memobox_receive_id', select: 'user_nickname user_profile_uri'})
			.sort('-_id')
			.exec();

		tempObject = resultMemoBox;

		//삭제할 정보 구축
		let addDelete = Object();
		let memobox_delete_info = Array();
		addDelete.deleted_user = req.session.loginUser;
		addDelete.deleted_date = Date.now();
		memobox_delete_info.push(addDelete);

		//속성에 대입 및 업데이트
		for (let j = 0; j < tempObject.length; j++) {
			tempObject[j].memobox_delete_info = memobox_delete_info;
			tempObject[j].save();
		}

		res.json({status: 200, msg: tempObject});
	});
});

//쪽지를 보내고 받은 모든 대상으로 1개씩만 가져오기 order by:DESC
router.post('/getMemoBoxAllList', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let memoBox = await MemoBox.model
			.find({
				$and: [
					{
						$or: [
							{memobox_send_id: mongoose.Types.ObjectId(req.session.loginUser)},
							{memobox_receive_id: mongoose.Types.ObjectId(req.session.loginUser)},
						],
					},
					{
						'memobox_delete_info.deleted_user': {$ne: mongoose.Types.ObjectId(req.session.loginUser)},
					},
				],
			})
			.sort('-_id')
			.lean();

		//쪽지의 상대방이 누구인지 송수신 속성값에 있는 것을 opponent 속성값 하나에 넣는다. (group으로 묶기 위함)
		for (let i = 0; i < memoBox.length; i++) {
			if (JSON.stringify(memoBox[i].memobox_send_id).replace(/[\"]/gi, '') == req.session.loginUser) {
				memoBox[i].opponent = JSON.stringify(memoBox[i].memobox_receive_id).replace(/[\"]/gi, '');
			} else {
				memoBox[i].opponent = JSON.stringify(memoBox[i].memobox_send_id).replace(/[\"]/gi, '');
			}
		}
		result = memoBox;
		checkComplete = Array();
		// 신규의 opponent만 배열에 넣고 나머지는 모두 버려서 사용자별로 1개씩만 앱에서 표출 되도록 함.
		for (let i = 0; i < result.length; i++) {
			if (i == 0) checkComplete.push(result[0]);
			else {
				for (let j = 0; j < checkComplete.length; j++) {
					if (checkComplete[j].opponent == result[i].opponent) {
						break;
					} else if (j == checkComplete.length - 1) {
						checkComplete.push(result[i]);
					}
				}
			}
		}

		for (let i = 0; i < checkComplete.length; i++) {
			userinfo = await User.model.findById(checkComplete[i].opponent).select('user_nickname user_profile_uri');
			checkComplete[i].opponent_user_nickname = userinfo.user_nickname;
			checkComplete[i].opponent_user_profile_uri = userinfo.user_profile_uri;
		}

		res.json({status: 200, msg: checkComplete});
	});
});

//특정 사용자와의 쪽지 내용 불러오기 order by:ASC
router.post('/getMemoBoxWithReceiveID', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let memoBox = await MemoBox.model
			.find({
				$and: [
					{
						$or: [
							{
								$and: [
									{memobox_send_id: mongoose.Types.ObjectId(req.session.loginUser)},
									{memobox_receive_id: mongoose.Types.ObjectId(req.body.user_object_id)},
								],
							},
							{
								$and: [
									{memobox_send_id: mongoose.Types.ObjectId(req.body.user_object_id)},
									{memobox_receive_id: mongoose.Types.ObjectId(req.session.loginUser)},
								],
							},
						],
					},
					{
						'memobox_delete_info.deleted_user': {$ne: mongoose.Types.ObjectId(req.session.loginUser)},
					},
				],
			})
			.populate({path: 'memobox_send_id', select: 'user_nickname user_profile_uri'})
			.populate({path: 'memobox_receive_id', select: 'user_nickname user_profile_uri'})
			.sort('_id')
			.exec();
		res.json({status: 200, msg: memoBox});
	});
});

//쪽지 신고하기 (memoboxObjectID로 신고)
router.post('/setMemoBoxWithReport', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		//배열로 받은 memoboxObjectID를 split 시킴
		objectArray = req.body.memobox_object_id.split(',');
		made_Array_objectid = new Array();

		//find 검색의 in 조건절로 넣어주기 위해 mongoose.Types.ObjectId 데이터 형의 Array를 만들어 준다.
		for (let i = 0; i < objectArray.length; i++) {
			made_Array_objectid.push(mongoose.Types.ObjectId(objectArray[i]));
		}

		//송수신중 로그인한 계정이 속해있고 삭제 대상의 유저 object에 속할 경우 업데이트 진행
		let resultMemoBox = await MemoBox.model
			.find()
			.where('_id')
			.in(made_Array_objectid)
			.populate({path: 'memobox_send_id', select: 'user_nickname user_profile_uri'})
			.populate({path: 'memobox_receive_id', select: 'user_nickname user_profile_uri'})
			.updateMany({$set: {memobox_report_info: {report_user: req.session.loginUser, report_date: Date.now()}}})
			.sort('-_id')
			.exec();

		res.json({status: 200, msg: resultMemoBox});
	});
});

//로그인 대상으로 상대방을 팔로우 했는지 확인
router.post('/getChekingFollow', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let followList = await Follow.model
			.find({follow_id: req.session.loginUser, follower_id: req.body.follow_userobject_id})
			.where('follow_is_delete')
			.ne(true)
			.exec();
		let followCheck = false;
		if (followList.length > 0) followCheck = true;
		res.json({status: 200, msg: followCheck});
	});
});

//sms 인증을 위한 토큰 발행
router.post('/getSMStoken', (req, res) => {
	controller(req, res, async () => {
		const response = await axios({
			url: 'https://api.iamport.kr/users/getToken',
			method: 'post', // POST method
			headers: {'Content-Type': 'application/json'}, // "Content-Type": "application/json"
			data: {
				imp_key: '8427182330724644', // REST API키
				imp_secret: '7a968900ca1ae8e30ec448bf9c5f7b0716424e80f8c5aea716f88b8a01453efe9498764041c35122', // REST API Secret
			},
		});
		res.json({status: 200, msg: response.data.response});
	});
});

//sms 인증을 위한 가맹점 식별코드
router.post('/getSMSimpcode', (req, res) => {
	controller(req, res, async () => {
		const impcode = 'imp72342634';
		res.json({status: 200, msg: impcode});
	});
});

//비밀번호 변경
router.post('/updateUserPassword', (req, res) => {
	controller(req, res, async () => {
		let user = await User.model
			.findOneAndUpdate(
				{user_phone_number: req.body.user_phone_number},
				{$set: {user_password: req.body.new_password}},
				{new: true, setDefaultsOnInsert: true},
			)
			.exec();

		if (!user) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({status: 200, msg: user});
	});
});

//알람 상태 변경
router.post('/setAlarmStatus', (req, res) => {
	controller(req, res, async () => {
		let user = await User.model
			.findOneAndUpdate(
				{_id: req.body.user_object_id},
				{$set: {user_alarm: req.body.user_alarm}},
				{new: true, upsert: true, setDefaultsOnInsert: true},
			)
			.lean();

		if (!user) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({status: 200, msg: user});
	});
});

//알람 상태 확인
router.post('/getAlarmStatus', (req, res) => {
	controller(req, res, async () => {
		let user = await User.model.findById(req.body.user_object_id).select('user_alarm').lean();
		if (!user) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({status: 200, msg: user});
	});
});

//사용자 가입 계정 개수
router.post('/getUserAccountCount', (req, res) => {
	controller(req, res, async () => {
		let userCount = await User.model.find({user_phone_number: req.body.user_phone_number}).count();
		res.json({status: 200, msg: userCount + ''});
	});
});

module.exports = router;
