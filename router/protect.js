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
	ALERT_NO_RESULT,
	LOGOUT_FAILED,
	LOGOUT_SUCCESS,
	ALERT_DUPLICATE_NICKNAME,
	ALERT_NOT_VALID_USEROBJECT_ID,
	USER_NOT_FOUND,
	ALERT_NOT_VALID_TARGER_OBJECT_ID,
} = require('./constants');

//유저의 보호동물(프로필에서 보여지는) 목록 조회
router.post('/getUserProtectAnimalList', (req, res) => {
	controller(req, res, async () => {
		let user = await User.model.findById(req.body.userobject_id).exec();
		if (user.user_type != 'user') {
			res.json({status: 400, msg: USER_NOT_VALID_TYPE});
			return;
		}

		user = await User.model
			.findById(req.body.userobject_id)
			.populate({path: 'user_my_pets' /*,select:'user_type user_nickname user_profile_uri pet_status'*/, match: {pet_status: 'protect'}})
			.exec();

		if (user.user_my_pets.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({status: 200, msg: user.user_my_pets});
	});
});

//동물보호(입양, 임시보호) 신청
router.post('/createProtectActivity', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let newActivity = await ProtectActivity.makeNewdoc({
			protect_act_applicant_id: req.session.loginUser,
			protect_act_request_article_id: req.body.protect_request_object_id,
			protect_act_address: req.body.protect_act_address,
			protect_act_checklist: req.body.protect_act_checklist,
			protect_act_companion_history: req.body.protect_act_companion_history,
			protect_act_motivation: req.body.protect_act_motivation,
			protect_act_phone_number: req.body.protect_act_phone_number,
			protect_act_type: req.body.protect_act_type,
		});

		let requestArticle = await ProtectRequest.model.findById(newActivity.protect_act_request_article_id);
		if (!requestArticle) {
			res.json({status: 404, msg: ALERT_NOT_VALID_TARGER_OBJECT_ID});
			return;
		}
		newActivity.protect_act_request_shelter_id = requestArticle.protect_request_writer_id;
		newActivity.protect_act_protect_animal_id = requestArticle.protect_animal_id;

		await newActivity.save();

		res.json({status: 200, msg: newActivity});
	});
});

/**
 * 유저의 동물보호 신청내역 가져오기
 * (입양신청, 임시보호 신청, 봉사활동 신청 - 한 화면에서 입양신청 1개, 임시보호 신청 1개, 봉사활동 신청 3 ~ 4개 표출)
 * 로그인을 하여야 신청내역을 볼수있음.(입력 파라메터 없음)
 *
 */
router.post('/getAppliesRecord', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let applies = await ProtectActivity.model.find({protect_act_applicant_id: req.session.loginUser});
		if (applies.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({
			status: 200,
			msg: {
				adopt: applies.filter(v => v.protect_act_type == 'adopt'),
				protect: applies.fileter(v => v.protect_act_type == 'protect'),
				volunteer: [], //봉사활동 부분 추가해야함
			},
		});
	});
});

/**
 * 유저의 보호활동(입양,임시보호) 신청 내역을 가져오기
 *
 *
 */
router.post('/getUserAdoptProtectionList', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let applies = await ProtectActivity.model
			.find({protect_act_applicant_id: req.session.loginUser, protect_act_type: req.body.protect_act_type})
			.sort("-_id")
			.limit(req.body.request_number)
			.exec();
		if (applies.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({
			status: 200,
			msg: applies,
		});
	});
});

module.exports = router;
