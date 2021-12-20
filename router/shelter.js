const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Feed = require('../schema/feed');
const ShelterAnimal = require('../schema/shelterProtectAnimal');
const ProtectRequest = require('../schema/protectRequest');
const uploadS3 = require('../common/uploadS3');
const {controller, controllerLoggedIn} = require('./controller');
const {
	USER_NOT_VALID_TYPE,
	LOGOUT_FAILED,
	LOGOUT_SUCCESS,
	ALERT_DUPLICATE_NICKNAME,
	ALERT_NOT_VALID_USEROBJECT_ID,
	USER_NOT_FOUND,
	ALERT_NO_RESULT,
} = require('./constants');

//보호소의 보호 동물을 등록한다.
router.post('/assignShelterAnimal', uploadS3.array('protect_animal_photo_uri_list'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		if (req.session.user_type != 'shelter') {
			res.json({status: 400, msg: USER_NOT_VALID_TYPE});
			return;
		}

		const protectAnimal = await ShelterAnimal.makeNewdoc({
			protect_animal_rescue_date: req.body.protect_animal_rescue_date,
			protect_animal_rescue_location: req.body.protect_animal_rescue_location,
			protect_animal_species: req.body.protect_animal_species,
			protect_animal_species_detail: req.body.protect_animal_species_detail,
			protect_animal_neutralization: req.body.protect_animal_neutralization,
			protect_animal_sex: req.body.protect_animal_sex,
			protect_animal_estimate_age: req.body.protect_animal_estimate_age,
			protect_animal_weight: req.body.protect_animal_weight,
			protect_animal_belonged_shelter_id: req.session.loginUser,
		});

		if (req.files.length > 0) protectAnimal.protect_animal_photo_uri_list = req.files.map(file => file.location);

		await protectAnimal.save();

		//res.status(200);
		res.json({status: 200, msg: protectAnimal});
	});
});

//동물보호 요청 게시물을 작성한다.
router.post('/createProtectRequest', uploadS3.array('protect_request_photos'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		if (req.session.user_type != 'shelter') {
			res.json({status: 400, msg: USER_NOT_VALID_TYPE});
			return;
		}

		let animal = await ShelterAnimal.model.findById(req.body.shelter_protect_animal_object_id).exec();
		if (!animal) {
			res.json({status: 400, msg: USER_NOT_FOUND});
			return;
		}
		
		let newRequest = await ProtectRequest.makeNewdoc({
			// protect_animal_id: {...animal},
			protect_request_title: req.body.protect_request_title,
			protect_request_content: req.body.protect_request_content,
			protect_request_writer_id: req.session.loginUser,
			protect_animal_species: animal.protect_animal_species,
			protect_animal_species_detail: animal.protect_animal_species_detail,
			protect_request_photos_uri: [],
		});

		if (req.files&&req.files.length > 0) {
			req.files.forEach(file => {
				newRequest.protect_request_photos_uri.push(file.location);
			});
		}
		if (animal.protect_animal_photo_uri_list.length > 0) {
			animal.protect_animal_photo_uri_list.forEach(uri => newRequest.protect_request_photos_uri.push(uri));
		}
		animal.protect_animal_protect_request_id = newRequest._id;
		newRequest.protect_animal_id = {...animal};
		await newRequest.save();
		await animal.save();

		res.json({status: 200, msg: newRequest});
	});
});

//동물보호요청을 가져온다.(추천 알고리즘이 필요, 지금은 모든 요청 게시물이 다 뜸)
router.post('/getProtectRequestList', (req, res) => {
	controller(req, res, async () => {
		let requestList = ProtectRequest.model.find();

		if (req.body.protect_animal_species) {
			requestList.find({protect_animal_species: {$regex: req.body.protect_animal_species}});

			// find({protect_animal_species: req.body.protect_animal_species});
		}

		if (req.body.city) {
			requestList.populate({
				path: 'protect_request_writer_id',
				//select: 'shelter_address shelter_name shelter_delegate_contact_number',
				match: {'shelter_address.brief': {$regex: req.body.city}, options: {limit: req.body.request_number}},
			});
		}

		if (req.body.adoptable_posts && req.body.adoptable_posts == 'true') {
			requestList.find({protect_request_status: 'rescue'});
		}

		requestList = await requestList.exec();
		requestList = requestList.filter(v => v.protect_request_writer_id != null);

		if (requestList.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}
		res.json({status: 200, msg: requestList});
	});
});

//보호소가 보호중인 동물 리스트를 조회한다.
router.post('/getShelterProtectAnimalList', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		if (req.session.user_type != 'shelter') {
			res.json({status: 401, msg: USER_NOT_VALID_TYPE});
			return;
		}

		let animalList = ShelterAnimal.model.find({protect_animal_belonged_shelter_id: req.session.loginUser});
		animalList.limit(req.body.request_number);
		animalList = await animalList.exec();
		if (animalList.length < 1) {
			//res.status(404);
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		//res.status(200);
		res.json({status: 200, msg: animalList});
	});
});

//해당 보호소의 동물보호 요청 게시물을 불러온다.
router.post('/getProtectRequestListByShelterId', (req, res) => {
	controller(req, res, async () => {
		let shelter = await User.model.findById(req.body.shelter_userobject_id).exec();
		if (!shelter) {
			res.json({status: 404, msg: USER_NOT_FOUND});
			return;
		}
		if (shelter.user_type != 'shelter') {
			res.json({status: 400, msg: USER_NOT_VALID_TYPE});
			return;
		}

		let filterObj = {protect_request_writer_id: shelter._id};
		let status = req.body.protect_request_status;
		let statusList = ['rescue', 'discuss', 'nearrainbow', 'complete'];
		if (status && statusList.some(v => v == status)) {
			filterObj = {...filterObj, protect_request_status: status};
		}
		if (!statusList.some(v => v == status)) {
			res.json({status: 400, msg: '허가되지 않은 상태 요청입니다.'});
			return;
		}

		let protectRequestList = await ProtectRequest.model.find(filterObj).limit(req.body.request_number).exec();
		if (protectRequestList.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({status: 200, msg: protectRequestList});
	});
});

//보호소에 보호활동(입양,임시보호)신청이 접수된 동물 목록을 조회
router.post('/getAnimalListWithApplicant', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		if (req.session.user_type != 'shelter') {
			res.json({status: 400, msg: USER_NOT_VALID_TYPE});
			return;
		}

		let animalWithApply = await ShelterAnimal.model
			.find({
				protect_animal_belonged_shelter_id: req.session.loginUser,
			})
			.populate('protect_act_applicants')
			.exec(); //요청

		animalWithApply = animalWithApply.filter(v=>v.protect_act_applicants.length>0);
		if(animalWithApply.length<1){
			res.json({status:404, msg:ALERT_NO_RESULT});
			return;
		}

		res.json({status: 200, msg: animalWithApply});
	});
});

module.exports = router;
