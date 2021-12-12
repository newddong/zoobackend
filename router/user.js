const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Post = require('../schema/post');
const uploadS3 = require('../common/uploadS3');
const {controller, controllerLoggedIn} = require('./controller');

//로그인
router.post('/userLogin',(req,res)=>{
	controller(req,res,async () => {

		if(req.session?.loginUser){
			res.status(200);
			res.json({status:200,msg:'이미 로그인된 상태입니다'});
			return;
		}
		
		let loginUser = await User.model.findOne().where('user_phone_number').equals(req.body.login_id);

		if(!loginUser){
			res.status(404);
			res.json({status:404,msg:'등록된 유저가 없습니다'});
			return;
		}
		let isValidPassword = loginUser.user_password == req.body.login_password;
		if(!isValidPassword){
			res.status(404);
			res.json({status:404,msg:'유효하지 않은 비밀번호입니다'});
			return;
		}
		
		req.session.loginUser = loginUser._id;
		req.session.user_nickname = loginUser.user_nickname;
		res.status(200);
		res.json({status:200, msg: loginUser})
	})

})

//로그아웃
router.post('/userLogout',(req,res)=>{
	controllerLoggedIn(req,res,async () => {
		try {
			req.session.destroy();
			res.status(200);
			res.json({status:200,msg:'로그아웃 성공'});
		}catch(err){
			res.status(500);
			res.json({status:500,msg:'로그아웃 실패'});
		}
	})
})

//유저 생성
router.post('/assignUser', uploadS3.single('user_profile_uri'), (req, res) => {
	controller(req, res,async  () => {
		const user = await User.makeNewdoc({
			user_agreement: JSON.parse(req.body.user_agreement),
			user_address: JSON.parse(req.body.user_address),
			user_mobile_company: req.body.user_mobile_company,
			user_name:req.body.user_name,
			user_password:req.body.user_password,
			user_phone_number:req.body.user_phone_number,
			user_nickname:req.body.user_nickname,
			user_profile_uri:req.file?.location,
			user_is_verified_phone_number:true,
		});
		const newUser = await user.save();
		res.json({status: 200, msg: newUser});
	});
});

//반려동물 생성
router.post('/assignPet',uploadS3.single('user_profile_uri'),(req,res)=>{
	controller(req,res,async ()=> {
		const pet = await User.makeNewdoc({
			pet_family:[req.body.user_id],
			pet_birthday: req.body.pet_birthday ,
			pet_is_temp_protection: req.body.pet_is_temp_protection ,
			pet_neutralization: req.body.pet_neutralization ,
			pet_sex: req.body.pet_sex ,
			pet_species: req.body.pet_species ,
			pet_species_detail: req.body.pet_species_detail ,
			pet_status: req.body.pet_status ,
			pet_weight: req.body.pet_weight ,
			user_nickname: req.body.user_nickname ,
			user_profile_uri: req.file?.location ,
			user_type: 'pet',
		});
		const newPet = await pet.save();
		const petOwner = await User.model.findById(req.body.user_id).exec();
		petOwner.user_my_pets.push(newPet._id);
		await petOwner.save();
		res.json({status: 200, msg: newPet});
	})

})

//보호소 생성
router.post('/assignShelter',uploadS3.single('user_profile_uri'),(req,res)=>{
	controller(req,res,async ()=>{
		const shelter = await User.makeNewdoc({
			shelter_address: JSON.parse(req.body.shelter_address),
			shelter_delegate_contact_number: req.body.shelter_delegate_contact_number ,
			user_phone_number: req.body.shelter_delegate_contact_number , //대표번호를 자동으로 로그인용 휴대폰 번호로 등록
			shelter_foundation_date: req.body.shelter_foundation_date ,
			shelter_homepage: req.body.shelter_homepage ,
			shelter_name: req.body.shelter_name ,
			user_nickname: req.body.shelter_name, //보호소 이름을 닉네임으로 설정
			user_name: req.body.shelter_name, //유저실명란도 보호소 이름으로 설정
			shelter_type: req.body.shelter_type ,
			user_email: req.body.user_email ,
			user_password: req.body.user_password ,
			user_profile_uri: req.file?.location ,
			user_type: 'shelter',
		});
		const newShelter = await shelter.save();
		res.json({status: 200, msg: newShelter});
	})
})

//보호소 코드 체크
router.post('/checkShelterCode',(req,res)=>{
	controller(req,res,async ()=>{
		let isValidCheckCode = 'ABCDE' == req.body.shelter_code;
		res.json({status:200,msg:isValidCheckCode});
	})
})



//이전 router code --




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
		profileImgUri: req.file?.location,
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
