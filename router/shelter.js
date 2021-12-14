const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Feed = require('../schema/feed');
const Shelter = require('../schema/shelterProtectAnimal');
const ProtectRequest = require('../schema/protectRequest');
const uploadS3 = require('../common/uploadS3');
const {controller, controllerLoggedIn} = require('./controller');
const {USER_NOT_VALID_TYPE, LOGOUT_FAILED, LOGOUT_SUCCESS, ALERT_DUPLICATE_NICKNAME, ALERT_NOT_VALID_USEROBJECT_ID, USER_NOT_FOUND} = require('./constants');

//보호소의 보호 동물을 등록한다.
router.post('/assignShelterAnimal', uploadS3.array('protect_animal_photo_uri_list'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		if (req.session.user_type != 'shelter') {
			res.status(400);
			res.json({status: 400, msg: USER_NOT_VALID_TYPE});
			return;
		}

		const protectAnimal = await Shelter.makeNewdoc({
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

		res.status(200);
		res.json({stauts: 200, msg: protectAnimal});
	});
});

//동물보호 요청 게시물을 작성한다.
router.post('/createProtectRequest', uploadS3.array('protect_request_photos'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		if (req.session.user_type != 'shelter') {
			res.status(400);
			res.json({status: 400, msg: USER_NOT_VALID_TYPE});
			return;
		}

		let animal = await Shelter.model.findById(req.body.shelter_protect_animal_object_id).exec();
		if(!animal){
			res.status(400);
			res.json({status:400, msg: USER_NOT_FOUND});
			return;
		}

		let newRequest = await ProtectRequest.makeNewdoc({
			protect_animal_id: req.body.shelter_protect_animal_object_id,
			protect_request_title: req.body.protect_request_title,
			protect_request_content: req.body.protect_request_content,
			protect_request_writer_id: req.session.loginUser
		});

		if(req.files.length>0){
			req.files.forEach((file)=>{newRequest.protect_request_photos.push(file.location)});
		}
		if(animal.protect_animal_photo_uri_list.length>0){
			animal.protect_animal_photo_uri_list.forEach((uri)=>newRequest.protect_request_photos.push(uri));
		}
		await newRequest.save();

		res.status(200);
		res.json({stauts: 200, msg:newRequest});
	});
});

module.exports = router;
