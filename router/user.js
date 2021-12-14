const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Post = require('../schema/post');
const Feed = require('../schema/feed');
const uploadS3 = require('../common/uploadS3');
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
	ALERT_NOt_VALID_TARGER_OBJECT_ID
} = require('./constants');
const {nicknameDuplicationCheck} = require('./utilfunction');

//로그인
router.post('/userLogin', (req, res) => {
	controller(req, res, async () => {
		if (req.session?.loginUser) {
			res.status(200);
			res.json({status: 200, msg: ALREADY_LOGIN});
			return;
		}

		let loginUser = await User.model.findOne().where('user_phone_number').equals(req.body.login_id);

		if (!loginUser) {
			res.status(404);
			res.json({status: 404, msg: USER_NOT_FOUND});
			return;
		}
		let isValidPassword = loginUser.user_password == req.body.login_password;
		if (!isValidPassword) {
			res.status(404);
			res.json({status: 404, msg: USER_PASSWORD_NOT_VALID});
			return;
		}

		req.session.loginUser = loginUser._id;
		req.session.user_type = loginUser.user_type;
		req.session.user_nickname = loginUser.user_nickname;
		res.status(200);
		res.json({status: 200, msg: loginUser});
	});
});

//로그아웃
router.post('/userLogout', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		try {
			req.session.destroy();
			res.status(200);
			res.json({status: 200, msg: LOGOUT_SUCCESS});
		} catch (err) {
			res.status(500);
			res.json({status: 500, msg: LOGOUT_FAILED});
		}
	});
});

//유저 생성
router.post('/assignUser', uploadS3.single('user_profile_uri'), (req, res) => {
	controller(req, res, async () => {
		const duplicateNickname = await User.model.findOne({user_nickname: req.body.user_nickname});
		if (duplicateNickname != null) {
			res.status(400);
			res.json({status: 400, msg: ALERT_DUPLICATE_NICKNAME});
			return;
		}

		const user = await User.makeNewdoc({
			user_agreement: JSON.parse(req.body.user_agreement),
			user_address: JSON.parse(req.body.user_address),
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
			pet_family: [req.body.user_id],
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
		const petOwner = await User.model.findById(req.body.user_id).exec();
		petOwner.user_my_pets.push(newPet._id);
		await petOwner.save();
		res.json({status: 200, msg: newPet});
	});
});

//보호소 생성
router.post('/assignShelter', uploadS3.single('user_profile_uri'), (req, res) => {
	controller(req, res, async () => {
		const shelter = await User.makeNewdoc({
			shelter_address: JSON.parse(req.body.shelter_address),
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
			.select(
				'user_type user_nickname user_profile_uri user_upload_count user_follow_count user_follower_count user_denied user_my_pets user_introduction',
			)
			.populate('user_my_pets', 'user_nickname user_profile_uri')
			.exec();

		if (!userInfo) {
			res.status(404);
			res.json({status: 404, msg: USER_NOT_FOUND});
			return;
		}

		const feedList = await Feed.model.find().where('feed_writer_id').select('feed_thumbnail');

		const profile = {
			...userInfo._doc,
			feedList: feedList,
		};

		// const profile = Object.assign({},userInfo,feedList);

		res.status(200);
		res.json({status: 200, msg: profile});
	});
});

//유저 닉네임 중복체크
router.post('/nicknameDuplicationCheck', (req, res) => {
	controller(req, res, async () => {
		const duplicateUser = await User.model.findOne({user_nickname: req.body.user_nickname});
		const isDuplicate = duplicateUser != null;
		res.json({status: 200, msg: isDuplicate});
	});
});

//유저 정보를 수정
router.post('/updateUserInformation', uploadS3.single('user_profile_uri'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let userInfo = await User.model.findById(req.body.userobject_id).exec();
		if (userInfo == null) {
			res.status(400);
			res.json({status: 400, msg: ALERT_NOT_VALID_USEROBJECT_ID});
			return;
		}
		// if (userInfo.user_type != 'user') {
		// 	res.status(400);
		// 	res.json({status: 400, msg: '대상이 유저가 아닙니다.'});
		// 	return;
		// }
		const duplicateNickname = await User.model.findOne({user_nickname: req.body.user_nickname});
		if (duplicateNickname != null) {
			res.status(400);
			res.json({status: 400, msg: ALERT_DUPLICATE_NICKNAME});
			return;
		}
		userInfo.user_nickname = req.body.user_nickname;

		if (req.file) {
			userInfo.user_profile_uri = req.file?.location;
		}
		await userInfo.save();

		res.status(200);
		res.json({status: 200, msg: userInfo});
	});
});

//유저 상세 정보를 수정
router.post('/updateUserDetailInformation', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let userInfo = await User.model.findById(req.body.userobject_id).exec();
		if (userInfo == null) {
			res.status(400);
			res.json({status: 400, msg: ALERT_NOT_VALID_USEROBJECT_ID});
			return;
		}
		userInfo.user_birthday = req.body.user_birthday;
		userInfo.user_sex = req.body.user_sex;
		userInfo.user_interests = JSON.parse('[' + req.body.user_interests + ']');
		userInfo.user_address = JSON.parse(req.body.user_address);

		await userInfo.save();
		res.status(200);
		res.json({status: 200, msg: userInfo});
	});
});

//반려동물 상세 정보를 수정
router.post('/updatePetDetailInformation', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let pet = await User.model.findById(req.body.userobject_id).exec();
		if (!pet) {
			res.status(404);
			res.json({status: 404, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}

		let isFamily = pet.pet_family.includes(req.session.loginUser);
		if(!isFamily){
			res.status(400);
			res.json({status: 400, msg: USER_NOT_VALID})
			return;
		}

		pet.pet_sex = req.body.pet_sex;
		pet.pet_neutralization = req.body.pet_neutralization;
		pet.pet_birthday = req.body.pet_birthday;
		pet.pet_weight = req.body.pet_weight;
		await pet.save();

		res.json({status: 200, msg: pet});
	});
});

//반려동물의 가족계정에 유저를 추가
router.post('/addUserToFamily',(req,res)=>{
	controllerLoggedIn(req, res, async () => {
		let pet = await User.model.findById(req.body.userobject_id).exec();
		if (!pet) {
			res.status(404);
			res.json({status: 404, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}

		let isFamily = pet.pet_family.includes(req.session.loginUser);
		if(!isFamily){
			res.status(400);
			res.json({status: 400, msg: USER_NOT_VALID})
			return;
		}

		let targetUser = await User.model.findById(req.body.family_userobject_id).exec();
		if (!targetUser) {
			res.status(404);
			res.json({status: 404, msg: ALERT_NOt_VALID_TARGER_OBJECT_ID});
			return;
		}

		pet.pet_family.push(targetUser._id);
		await pet.save();
		targetUser.user_my_pets.push(pet._id);
		await targetUser.save();

		res.status(200);
		res.json({status:200, pet: pet, targetUser: targetUser});
	})
});


//유저의 패스워드를 변경
router.post('/changeUserPassword',(req,res)=>{
	controllerLoggedIn(req,res, async ()=> {
		let user = await User.model.findById(req.session.loginUser).exec();
		if(user.user_password!=req.body.user_password){
			res.status(400);
			res.json({status:400,msg:USER_PASSWORD_NOT_VALID});
			return;
		}
		user.user_password = req.body.new_user_password;
		await user.save();
		res.status(200);
		res.json({status:200,msg:user});
	})
})


//=================================이전 router code =============================================================================

router.post('/getUserList', async (req, res) => {
	console.log("%s %s [%s] %s %s %s | getUserList by %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
	// if (req.session.user_id) {
	try {
		let result = await User.model
			.find()
			.where('nickname')
			.regex(req.body.nickname)
			.select('_id id name userType nickname profileImgUri text_intro')
			.sort('nickname')
			.exec();

		res.json({
			status: 200,
			msg: result,
		});
	} catch (err) {
		console.error("%s %s [%s] %s %s %s | database error", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
		res.json({status: 500, msg: err});
	}
	// } else {
	// 	console.log("%s %s [%s] %s %s %s | unauthorized access", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
	// 	res.json({ status: 401, msg: "Unauthorized" });
	// }
});

router.post('/getUserPetList', async (req, res) => {
	console.log("%s %s [%s] %s %s %s | getUserPetList %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.body.user_id); // prettier-ignore
	try {
		if (req.body.user_id) {
			let result = await User.model
				.findById(req.body.user_id)
				.select('belonged_pets')
				.populate({
					path: 'belonged_pets',
					match: {deleted: {$eq: false}},
					select: 'age sex adoptionType animalKind animalKindDetail animalNo owner nickname count profileImgUri text_intro deleted',
				});
			res.json({status: 200, msg: result});
		} else {
			res.json({status: 400, msg: 'bad request'});
		}
	} catch (err) {
		console.error("%s %s [%s] %s %s %s | database error", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
		console.error(err);
		res.json({status: 500, msg: err});
	}
});

router.post('/update', (req, res) => {});

router.post('/delete', (req, res) => {});

module.exports = router;
