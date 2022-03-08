const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Feed = require('../schema/feed');
const ShelterAnimal = require('../schema/shelterProtectAnimal');
const ProtectRequest = require('../schema/protectRequest');
const ProtectActivity = require('../schema/protectionActivityApplicant');
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
	ALERT_NO_POST,
} = require('./constants');
const mongoose = require('mongoose');

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

		if (req.files && req.files.length > 0) protectAnimal.protect_animal_photo_uri_list = req.files.map(file => file.location);

		await protectAnimal.save();

		//res.status(200);
		res.json({status: 200, msg: protectAnimal});
	});
});

//동물보호 요청 게시물을 작성한다.
router.post('/createProtectRequest', uploadS3.array('protect_request_photos_uri'), (req, res) => {
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

		if (req.files && req.files.length > 0) {
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
		await User.model.findOneAndUpdate({_id: req.session.loginUser}, {$inc: {user_upload_count: 1}});
		res.json({status: 200, msg: newRequest});
	});
});

//동물보호요청을 가져온다.(추천 알고리즘이 필요, 지금은 모든 요청 게시물이 다 뜸)
router.post('/getProtectRequestList', (req, res) => {
	controller(req, res, async () => {
		let requestList = ProtectRequest.model.find().where('protect_request_is_delete').ne(true);

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
		} else {
			requestList.populate({
				path: 'protect_request_writer_id',
				//select: 'shelter_address shelter_name shelter_delegate_contact_number',
				options: {limit: req.body.request_number},
			});
		}

		if (req.body.adoptable_posts && req.body.adoptable_posts == 'true') {
			requestList.find({$or: [{protect_request_status: 'rescue'}, {protect_request_status: 'discuss'}]});
		}

		requestList = await requestList.sort('-_id').exec();
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

		let animalList = ShelterAnimal.model.find({protect_animal_belonged_shelter_id: req.session.loginUser}).where('protect_animal_status').ne('adopt');
		animalList.limit(req.body.request_number);
		animalList = await animalList.sort('-_id').exec();
		if (animalList.length < 1) {
			//res.status(404);
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({
			status: 200,
			msg: {
				hasRequest: animalList.filter(v => (v.protect_animal_protect_request_id ? v : null)),
				noRequest: animalList.filter(v => {
					if (v.protect_animal_protect_request_id == undefined || v.protect_animal_protect_request_id == '') return v;
				}),
			},
		});
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
		let statusList = ['all', 'rescue', 'discuss', 'nearrainbow', 'complete'];
		if (status && statusList.some(v => v == status)) {
			if (status == 'all') {
			} else {
				filterObj = {...filterObj, protect_request_status: status};
			}
		}
		if (!statusList.some(v => v == status)) {
			res.json({status: 400, msg: '허가되지 않은 상태 요청입니다.'});
			return;
		}

		let protectRequestList = await ProtectRequest.model
			.find(filterObj)
			.where('protect_request_is_delete')
			.ne(true)
			.populate('protect_request_writer_id')
			.limit(req.body.request_number)
			.sort('-_id')
			.exec();
		if (protectRequestList.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({status: 200, msg: protectRequestList});
	});
});

//보호소에 보호활동(입양,임시보호)신청이 접수된 동물 목록을 조회 (아래 사항으로 변경)
//보호소에 보호활동(입양,임시보호)신청이 접수된 신청자 목록 조회
router.post('/getAnimalListWithApplicant', (req, res) => {
	// controllerLoggedIn(req, res, async () => {
	// 	if (req.session.user_type != 'shelter') {
	// 		res.json({status: 400, msg: USER_NOT_VALID_TYPE});
	// 		return;
	// 	}

	// 	let animalWithApply = await ShelterAnimal.model
	// 		.find({
	// 			protect_animal_belonged_shelter_id: req.session.loginUser,
	// 		})
	// 		.populate('protect_act_applicants')
	// 		.sort('-_id')
	// 		.exec(); //요청

	// 	animalWithApply = animalWithApply.filter(v => v.protect_act_applicants.length > 0);
	// 	if (animalWithApply.length < 1) {
	// 		res.json({status: 404, msg: ALERT_NO_RESULT});
	// 		return;
	// 	}

	// 	res.json({status: 200, msg: animalWithApply});
	// });

	controllerLoggedIn(req, res, async () => {
		if (req.session.user_type != 'shelter') {
			res.json({status: 400, msg: USER_NOT_VALID_TYPE});
			return;
		}

		let animalWithApply = await ProtectActivity.model
			.find({
				protect_act_request_shelter_id: req.session.loginUser,
			})
			.populate('protect_act_applicant_id')
			.sort('-_id')
			.exec(); //요청

		let adoptList = new Array();
		let protectList = new Array();
		let total = new Object();

		for (let i = 0; i < animalWithApply.length; i++) {
			let data = new Object();
			if (animalWithApply[i].protect_act_type == 'adopt') {
				data = animalWithApply[i];
				adoptList.push(data);
			} else {
				data = animalWithApply[i];
				protectList.push(data);
			}
		}
		total.adopt = adoptList;
		total.protect = protectList;
		console.log('total', total);
		res.json({status: 200, msg: total});
	});
});

//보호소에 등록된 동물의 상세 정보를 조회
router.post('/getProtectAnimalByProtectAnimalId', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		if (req.session.user_type != 'shelter') {
			res.json({status: 400, msg: USER_NOT_VALID_TYPE});
			return;
		}

		let animal = await ShelterAnimal.model.findById(req.body.shelter_protect_animal_object_id).exec();

		if (!animal) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({status: 200, msg: animal});
	});
});

/**
 * 보호소에 등록된 동물의 상태를 변경
 */
router.post('/setShelterProtectAnimalStatus', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let shelterAnimal = await ShelterAnimal.model.findById(req.body.shelter_protect_animal_object_id).exec();
		console.log('shelterAnimal=>', shelterAnimal);
		if (!shelterAnimal) {
			res.json({status: 404, msg: '요청한 ID와 일치하는 보호소 동물이 존재하지 않습니다.'});
			return;
		}

		const userType = req.session.user_type;
		const statusList = ['rescue', 'protect', 'adopt', 'discuss', 'rainbowbridge'];
		const targetStatus = req.body.protect_animal_status; //요청 상태

		if (!statusList.some(v => v == targetStatus)) {
			res.json({status: 400, msg: REQUEST_PARAMETER_NOT_VALID});
			return;
		}

		if (userType == 'user') {
			res.json({status: 400, msg: USER_NOT_VALID_TYPE});
			return;
		}

		if (req.body.protect_animal_adoptor_id) {
			shelterAnimal.protect_animal_adoptor_id = req.body.protect_animal_adoptor_id;
		}

		if (req.body.protect_animal_protector_id) {
			shelterAnimal.protect_animal_protector_id = req.body.protect_animal_protector_id;
		}

		shelterAnimal.protect_animal_status = targetStatus;
		await shelterAnimal.save();

		res.json({status: 200, msg: shelterAnimal});
	});
});

/**
 * 보호소가 보호중인 동물에 관한 요청 게시글 리스트 조회
 */
router.post('/getProtectRequestListByProtectAnimalId', (req, res) => {
	controller(req, res, async () => {
		let protectRequestList = await ProtectRequest.model
			.find({'protect_animal_id._id': mongoose.Types.ObjectId(req.body.protect_animal_id)})
			.where('protect_request_is_delete')
			.ne(true);

		// console.log('req.body.protectRequestList=>', protectRequestList);

		if (!protectRequestList) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({status: 200, msg: protectRequestList});
	});
});

//동물보호 요청 게시물을 수정한다
router.post('/updateProtectRequest', uploadS3.array('protect_request_photos_uri'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		//유저가 shelter인지 확인
		if (req.session.user_type != 'shelter') {
			res.json({status: 400, msg: USER_NOT_VALID_TYPE});
			return;
		}

		let protectRequest = await ProtectRequest.model.findById(req.body.protect_request_object_id);

		if (!protectRequest) {
			res.json({status: 400, msg: ALERT_NO_POST});
			return;
		}

		if (req.body.protect_request_title) {
			protectRequest.protect_request_title = req.body.protect_request_title;
		}

		if (req.body.protect_request_content) {
			protectRequest.protect_request_content = req.body.protect_request_content;
		}

		let protect_photos_to_delete = new Array();
		protect_photos_to_delete = req.body.protect_photos_to_delete;

		//삭제할 사진이 있는지 확인 후 삭제 진행
		if (protect_photos_to_delete.length > 0) {
			let temp_list = new Array();
			temp_list.push(protectRequest.protect_request_photos_uri[0]);
			for (let i = 1; i < protectRequest.protect_request_photos_uri.length; i++) {
				//protect_photos_to_delete 배열은 1부터 시작(0은 무조건 넣어야 함), 1부터 체크해서 삭제 대상이 아닐 경우 배열에 push
				if (!protect_photos_to_delete.includes(i)) {
					temp_list.push(protectRequest.protect_request_photos_uri[i]);
				}
			}
			protectRequest.protect_request_photos_uri = [...temp_list];
		}

		if (req.files && req.files.length > 0) {
			req.files.forEach(file => {
				protectRequest.protect_request_photos_uri.push(file.location);
			});
		}
		protectRequest.protect_request_update_date = Date.now();
		await protectRequest.save();

		res.json({status: 200, msg: protectRequest});
	});
});

//동물보호 요청 게시물을 삭제한다
router.post('/deleteProtectRequest', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		//유저가 shelter인지 확인
		if (req.session.user_type != 'shelter') {
			res.json({status: 400, msg: USER_NOT_VALID_TYPE});
			return;
		}

		let protectRequest = await ProtectRequest.model.findById(req.body.protect_request_object_id);

		if (!protectRequest) {
			res.json({status: 400, msg: ALERT_NO_POST});
			return;
		}

		protectRequest.protect_request_update_date = Date.now();
		protectRequest.protect_request_is_delete = true;
		await protectRequest.save();

		//보호소의 동물보호 컬렉션의 게시물 참조 필드값도 삭제해야 함.
		let shelterAnimal = await ShelterAnimal.model.findOne({protect_animal_protect_request_id: protectRequest._id});
		shelterAnimal.protect_animal_protect_request_id = undefined;
		await shelterAnimal.save();

		res.json({status: 200, msg: protectRequest});
	});
});

//우리 보호소 출신 동물 - 입양처 보기 조회
router.post('/getAdoptInfo', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		if (req.session.user_type != 'shelter') {
			res.json({status: 400, msg: USER_NOT_VALID_TYPE});
			return;
		}

		let shelterAnimal = await ShelterAnimal.model.findById(req.body.protect_animal_object_id).exec();

		console.log('shelterAnimal=>', shelterAnimal);

		if (!shelterAnimal) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		let result = new Object();

		for (let i = 0; i < shelterAnimal.protect_act_applicants.length; i++) {
			let protect_act_applicants = new Object();
			protect_act_applicants_id = shelterAnimal.protect_act_applicants[i];

			//신청서 검색
			let ProtectActivityApplicant = await ProtectActivity.model
				.findById(protect_act_applicants_id)
				.populate('protect_act_applicant_id')
				.populate('protect_act_request_article_id')
				.populate('protect_act_protect_animal_id')
				.populate('protect_act_request_shelter_id')
				.exec();

			if (ProtectActivityApplicant.protect_act_status == 'accept') {
				result = ProtectActivityApplicant;
				break;
			}
		}

		res.json({status: 200, msg: result});
	});
});

module.exports = router;
