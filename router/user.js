const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Post = require('../schema/post');
const uploadS3 = require('../common/uploadS3');
const { procedure, sessionProcedure } = require('./procedure');

/**
 * A song
 * @typedef {object} Song
 * @property {string} title.required - The title
 * @property {string} artist - The artist
 * @property {string} cover - image cover - binary
 * @property {integer} year - The year - int64
 */

/**
 * POST /user/test
 * @tags User
 * @param {string} title.form - The title - multipart/form-data
 * @param {string} artist.form - The artist - multipart/form-data
 * @param {string}  cover.form - image cover - binary - multipart/form-data
 * @param {integer}  year.form - The year - multipart/form-data
 * @return {object} 200 - User created
 */
router.post('/test',uploadS3.array('cover',99),(req,res)=>{
	console.log("ip - %s | date - [%s] | method - %s | protocol - %s | host - %s | path - %s | user - %s", req.ip, new Date(), req.method, req.protocol, req.hostname, req.originalUrl, req.session.user); // prettier-ignore
	// console.log('test activity   ',req);
	res.json({status: 200, msg: req.body});

});



/**
 * 유저 동의 정보
 * @typedef {object} UserAgreement
 * @property {boolean} is_over_fourteen - (동의)14살 이상
 * @property {boolean} is_service - (동의)서비스 동의
 * @property {boolean} is_personal_info - (동의)개인정보제공
 * @property {boolean} is_location_service_info - (동의)위치정보제공
 * @property {boolean} is_donation_info - (동의)기부정보
 * @property {boolean} is_marketting_info - (동의)마케팅정보
 */

/**
 * 유저의 지역
 * @typedef {object} UserAddress
 * @property {string} city - 유저의 지역(시,군,도)
 * @property {string} district - 유저의 지역2(시,구)
 * @property {string} neighbor - 유저의 지역3(읍,면,동)
 */

/**
 * 유저 등록에 필요한 항목 정의
 * @typedef {object} UserAssign
 * @property {UserAgreement} user_agreement - 가입항목 동의
 * @property {UserAddress} user_address - 유저 지역
 * @property {string} user_mobile_company - 이동통신사
 * @property {string} user_name - 유저 이름(실명)
 * @property {string} user_password - 유저 패스워드
 * @property {string} user_phone_number - 유저 핸드폰 번호
 * @property {boolean} user_is_verified_phone_number - 핸드폰 인증여부
 */


/**
 * POST /user/assignUser
 * @tags User
 * @summary 유저를 등록
 * @param {UserAssign} request.body.required - 유저 동의 정보 - multipart/form-data
 * @return {object} 200 - 유저 생성 응답
 */
router.post('/assignUser',uploadS3.single('imgfile'),(req,res)=>{
	procedure(req,res,()=>{
		res.json({status:200,msg:req.body})
	})
})



router.post('/add', uploadS3.single('imgfile'), (req, res) => {
	console.log('add user => ' + req.body.id);
	console.log('img location uri  => ' + req.file.location);
	var user = User.makeNewdoc({
		id: req.body.id,
		password: req.body.password,
		name: req.body.name,
		userType: req.body.userType,
		idType: req.body.idType,
		nickname: req.body.nickname,
		shelter_name: req.body.shelter_name,
		shelter_addr: req.body.shelter_addr,
		shelter_phone: req.body.shelter_phone,
		shelter_email: req.body.shelter_email,
		shelter_url: req.body.shelter_url,
		shelter_foundation_date: req.body.shelter_foundation_date,
		reg_date: req.body.reg_date,
		upd_date: req.body.upd_date,
		profileImgUri: req.file.location,
		
	});

	user.save(err => {
		if (err) {
			console.log('error during add user to DB', err);
			res.json({status: 400, msg: err});
			// return;
		}
		console.log('successfully added user to DB ' + req.body.id);
		res.json({status: 200, msg: 'successed'});
	});
});

router.post('/addPet', uploadS3.single('imgfile'), async (req, res) => {
	console.log("%s %s [%s] %s %s %s | addPet by %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
	if (req.session.user_id) {
		try {
			let pet = new User.model({
				sex: req.body.sex,
				adoptionType: req.body.adoptionType,
				animalKind: req.body.animalKind,
				animalKindDetail: req.body.animalKindDetail,
				animalNo: req.body.animalNo,
				nickname: req.body.nickname,
				userType: 'pet',
				profileImgUri: req.file?.location,
				owner: req.session.user_id,
			});
			let petResult = await pet.save();
			let userResult = await User.model.findByIdAndUpdate(req.session.user_id, {
				$push: {belonged_pets: petResult._id},
			});

			res.json({
				status: 200,
				msg: 'successed',
			});
		} catch (err) {
			console.error("%s %s [%s] %s %s %s | database error", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
			console.log(err);
			res.json({status: 500, msg: err});
		}
	} else {
		console.log("%s %s [%s] %s %s %s | unauthorized access", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
		res.json({status: 401, msg: 'Unauthorized'});
	}
});

router.get('/getMyProfile', (req, res) => {
	if (req.session.user) {
		console.log("%s %s [%s] %s %s %s | get user profile %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
		User.model
			.findOne()
			.where('id')
			.equals(req.session.user)
			.select('id name useType nickname profileImgUri')
			.exec((err, result) => {
				if (err) {
					console.error("%s %s [%s] %s %s %s | database error", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
					res.json({status: 500, msg: err});
				}
				res.json({status: 200, msg: result});
			});
	} else {
		console.log("%s %s [%s] %s %s %s | unauthorized access", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
		res.json({status: 401, msg: 'Unauthorized'});
	}
});

router.post('/getUserProfile', (req, res) => {
	// if(req.session.user){
	console.log("%s %s [%s] %s %s %s | get user profile %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.body.user_id); // prettier-ignore
	if (req.body.user_id) {
		User.model
			.findById(req.body.user_id)
			// .where("nickname")
			// .equals(req.body.nickname)
			.select('id name userType nickname profileImgUri belonged_pets volunteeractivity text_intro count deleted')
			.exec((err, user) => {
				if (err) {
					console.error("%s %s [%s] %s %s %s | database error", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
					res.json({status: 500, msg: err});
				}

				Post.model
					.find()
					.where('user')
					.equals(user._id)
					.sort('-_id')
					.exec((err, postList) => {
						if (err) {
							console.error("%s %s [%s] %s %s %s | database error", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
						}
						res.json({status: 200, msg: {user: user, postList: postList}});
					});
			});
	} else {
		res.json({status: 400, msg: 'Bad Request'});
	}
	// }
	// else{
	// 	console.log("%s %s [%s] %s %s %s | unauthorized access", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
	// 	res.json({status: 401, msg: "Unauthorized"})
	// }
});


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
