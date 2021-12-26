const express = require('express');
const router = express.Router();
const Address = require('../schema/address');
const PetType = require('../schema/pettype');
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

router.post('/inputPetType', (req, res) => {
	controller(req, res, async () => {
		let pettype = await PetType.model.findOne({pet_species: req.body.pet_species}).exec();

		if (pettype) {
			req.body.pet_species_detail.split(',').map(v => {
				if (!pettype.pet_species_detail.includes(v)) {
					pettype.pet_species_detail.push(v);
				}
			});
			await pettype.save();
			res.json({status: 200, msg: pettype});
			return;
		}

		let petcode = PetType.makeNewdoc({
			pet_species: req.body.pet_species,
			pet_species_detail: req.body.pet_species_detail.split(','),
		});

		await petcode.save();

		res.json({status: 200, msg: petcode});
	});
});

//
router.post('/getAddressList', (req, res) => {
	controller(req, res, async () => {
		let city = req.body.city;
		let district = req.body.district;
		let address = [];
		let list = [];
		if (!city && !district) {
			address = await Address.model.distinct('city').exec();
			list = address;
		}

		if (city && !district) {
			address = await Address.model.find({city: city}).exec();
			address.map(v => {
				list.includes(v.district) || list.push(v.district);
			});
			list.shift();
		}

		if (city && district) {
			address = await Address.model.find({city: city, district: district}).exec();
			address.map(v => {
				list.includes(v.neighbor) || list.push(v.neighbor);
			});
			list.shift();
		}
	
		res.json({status: 200, msg: list});
	});
});

module.exports = router;
