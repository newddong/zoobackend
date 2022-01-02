const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Feed = require('../schema/feed');
const PetType = require('../schema/pettype');
const uploadS3 = require('../common/uploadS3');
const Follow = require('../schema/follow');
const Address = require('../schema/address');
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
} = require('./constants');
const {nicknameDuplicationCheck} = require('./utilfunction');
const session = require('express-session');

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
		});
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
			shelter_name: req.body.shelter_name,
			user_nickname: req.body.shelter_name, //보호소 이름을 닉네임으로 설정
			user_name: req.body.shelter_name, //유저실명란도 보호소 이름으로 설정
			shelter_type: req.body.shelter_type,
			user_email: req.body.user_email,
			user_password: req.body.user_password,
			user_profile_uri: req.file?.location,
			user_type: 'shelter',
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

		let feedList = [];
		if (userInfo.user_type == 'pet') {
			feedList = await Feed.model.find({feed_avatar_id: userInfo._id}).limit(20).sort('-_id').lean();
		} else {
			feedList = await Feed.model.find({feed_writer_id: userInfo._id}).limit(20).sort('-_id').lean();
		}




		let follow = false;
		if(req.session&&req.session.loginUser){
			follow = await Follow.model.findOne({follow_id:userInfo._id, follower_id:req.session.loginUser}).lean();
		}
		follow = follow!=null&&!follow.follow_is_delete;


		const profile = {
			...userInfo,
			feedList: feedList,
			is_follow: follow
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
		let userInfo = await User.model.findById(req.body.userobject_id).exec();
		if (userInfo == null) {
			//res.status(400);
			res.json({status: 400, msg: ALERT_NOT_VALID_USEROBJECT_ID});
			return;
		}

		let user_interests = typeof req.body.user_interests == 'string' ? JSON.parse('[' + req.body.user_interests + ']') : req.body.user_interests;
		let user_address = typeof req.body.user_address == 'string' ? JSON.parse(req.body.user_address) : req.body.user_address;

		userInfo.user_birthday = req.body.user_birthday;
		userInfo.user_sex = req.body.user_sex;
		userInfo.user_interests = user_interests;
		userInfo.user_address = user_address;

		userInfo = await userInfo.save();
		//res.status(200);
		res.json({status: 200, msg: userInfo});
	});
});

//반려동물 상세 정보를 수정
router.post('/updatePetDetailInformation', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let pet = await User.model.findById(req.body.userobject_id).exec();
		if (!pet) {
			//res.status(404);
			res.json({status: 404, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}

		let isFamily = pet.pet_family.includes(req.session.loginUser);
		if (!isFamily) {
			//res.status(400);
			res.json({status: 400, msg: USER_NOT_VALID});
			return;
		}

		pet.pet_sex = req.body.pet_sex;
		pet.pet_neutralization = req.body.pet_neutralization;
		pet.pet_birthday = req.body.pet_birthday;
		pet.pet_weight = req.body.pet_weight;
		pet = await pet.save();

		res.json({status: 200, msg: pet});
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
		await pet.save();
		targetUser.user_my_pets.push(pet._id);
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
		if(req.session&&req.session.loginUser){
			follow = await Follow.model.findOne({follow_id:user._id, follower_id:req.session.loginUser}).lean();
		}
		follow = follow!=null&&!follow.follow_is_delete;
		
		user = {...user, is_follow : follow};

		res.json({status: 200, msg: user});
	});
});

//유저 소개글 변경
router.post('/updateUserIntroduction', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let user = await User.model.findById(req.session.loginUser).exec();
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

		shelter.shelter_name = req.body.shelter_name;
		shelter.shelter_address = typeof req.body.shelter_address == 'string' ? JSON.parse(req.body.shelter_address) : req.body.shelter_address;
		shelter.shelter_delegate_contact_number = req.body.shelter_delegate_contact_number;
		shelter.user_email = req.body.user_email;
		shelter.shelter_homepage = req.body.shelter_homepage;
		shelter.shelter_foundation_date = req.body.shelter_foundation_date;

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
			userList = await User.model
				.find({user_nickname: {$regex: petName}})
				.populate({path: 'pet_family', match: {user_nickname: {$regex: userName}}})
				.limit(requestnum)
				.lean();
			userList = userList.filter(v => v.pet_family.length > 0);
		} else {
			userList = await User.model
				.find({user_nickname: {$regex: nickname}})
				.limit(requestnum)
				.lean();
		}

		if (userList.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
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
				{follow_id: targetUser._id, follower_id:req.session.loginUser},
				{$set: {follow_id: targetUser._id, follower_id:req.session.loginUser, follow_is_delete: false}, $currentDate: {follow_update_date: true}},
				{new: true, upsert: true},
			)
			.lean();
		
		targetUser.user_follower_count++;
		await targetUser.save();
		await User.model.findOneAndUpdate({_id:req.session.loginUser},{$inc:{user_follow_count:1}});

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
				{follower_id: req.session.loginUser, follow_id: req.body.follow_userobject_id},
				{$set: {follow_is_delete: true}, $currentDate: {follow_update_date: true}},
				{new: true, upsert: false},
			)
			.lean();

		targetUser.user_follower_count--;
		await targetUser.save();
		await User.model.findOneAndUpdate({_id:req.session.loginUser},{$inc:{user_follow_count:-1}});

		res.json({status: 200, msg: follow});
	});
});

//대상 유저가 팔로우 한 유저를 검색한다.
router.post('/getFollows', (req, res) => {
	controller(req, res, async () => {
		let targetUser = await User.model.findById(req.body.userobject_id).lean();
		if (!targetUser) {
			res.json({status: 403, msg: '대상 유저가 존재하지 않습니다.'});
			return;
		}

		let follow = await Follow.model
			.find({follower_id: targetUser._id})
			.populate('follow_id')
			.lean();

		res.json({status: 200, msg: follow});
	});
});

//대상 유저를 팔로우 한 유저를 검색한다.
router.post('/getFollowers', (req, res) => {
	controller(req, res, async () => {
		let targetUser = await User.model.findById(req.body.userobject_id).lean();
		if (!targetUser) {
			res.json({status: 403, msg: '대상 유저가 존재하지 않습니다.'});
			return;
		}

		let follow = await Follow.model
			.find({follow_id: targetUser._id})
			.populate('follower_id')
			.lean();

		res.json({status: 200, msg: follow});
	});
});


module.exports = router;
