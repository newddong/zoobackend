const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Feed = require('../schema/feed');
const ShelterAnimal = require('../schema/shelterProtectAnimal');
const ProtectRequest = require('../schema/protectRequest');
const VolunteerActivity = require('../schema/volunteerActivityApplicant');
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
	REQUEST_PARAMETER_NOT_VALID,
} = require('./constants');

//봉사활동 신청서를 작성한다.
router.post('/assignVolunteerActivity', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		if (req.session.user_type != 'user') {
			res.json({status: 400, msg: USER_NOT_VALID_TYPE});
			return;
		}
		let shelter = await User.model.findById(req.body.shelter_userobject_id).exec();
		if (!shelter) {
			res.json({status: 404, msg: USER_NOT_FOUND});
			return;
		}
		if (shelter.user_type != 'shelter') {
			res.json({status: 400, msg: USER_NOT_VALID_TYPE});
			return;
		}
		// console.log(req.body.volunteer_wish_date_list);
		// console.log(typeof req.body.volunteer_wish_date_list);
		let wishDates =
			typeof req.body.volunteer_wish_date_list == 'string' ? req.body.volunteer_wish_date_list.split(',') : req.body.volunteer_wish_date_list;

		let volunteerActivity = await VolunteerActivity.makeNewdoc({
			volunteer_target_shelter: req.body.shelter_userobject_id,
			volunteer_wish_date: wishDates,
			volunteer_accompany: req.body.accompany_userobject_id_list, //
			volunteer_delegate_contact: req.body.volunteer_delegate_contact,
		});

		volunteerActivity.volunteer_accompany.push(req.session.loginUser);
		if (req.body.accompany_userobject_id_list && req.body.accompany_userobject_id_list.length > 0) {
			volunteerActivity.volunteer_accompany = volunteerActivity.volunteer_accompany.concat(
				req.body.accompany_userobject_id_listaccompany_userobject_id_list,
			);
		}

		await volunteerActivity.save();

		res.json({status: 200, msg: volunteerActivity});
	});
});

//봉사활동 신청서를 열람한다.
router.post('/getVolunteerActivityById', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let volunteerActivity = await VolunteerActivity.model.findById(req.body.volunteer_activity_object_id).exec();
		if (!volunteerActivity) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({status: 200, msg: volunteerActivity});
	});
});

//유저의 봉사활동 신청서 목록을 불러온다.
router.post('/getUserVolunteerActivityList', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let volunteerActivityList = await VolunteerActivity.model
			.find({
				volunteer_accompany: {$elemMatch: {$eq: req.session.loginUser}},
			})
			.exec();
		if (volunteerActivityList.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({status: 200, msg: volunteerActivityList});
	});
});

//봉사활동 신청서의 상태를 변경한다.
router.post('/setVolunteerActivityStatus', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let volunteerActivity = await VolunteerActivity.model.findById(req.body.volunteer_activity_object_id).exec();
		if (!volunteerActivity) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}
		let viewer = await User.model.findById(req.session.loginUser).exec();

		const userType = viewer.user_type;
		const statusList = ['done', 'notaccept', 'accept', 'waiting', 'cancel'];
		const status = req.body.volunteer_status;

		if (!statusList.some(v => v == status)) {
			res.json({status: 400, msg: REQUEST_PARAMETER_NOT_VALID});
			return;
		}

		if (userType == 'user' && ['notaccept', 'accept'].some(v => v == status)) {
			res.json({status: 400, msg: '해당 유저 타입에는 허가되지 않은 요청입니다.'});
			return;
		}

		if (userType == 'shelter' && status == 'cancel') {
			res.json({status: 400, msg: '해당 유저 타입에는 허가되지 않은 요청입니다.'});
			return;
		}
		volunteerActivity.volunteer_status = status;
		await volunteerActivity.save();

		res.json({status: 200, msg: volunteerActivity});
	});
});

//보호소에 접수된 봉사활동 신청서 목록을 불러온다.(로그인 필요)
router.post('/getShelterVolunteerActivityList', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		if (req.session.user_type != 'shelter') {
			res.json({status: 400, msg: USER_NOT_VALID_TYPE});
		}

		let filterObj = {
			volunteer_target_shelter: req.session.loginUser,
		};
		if (req.body.volunteer_status) {
			filterObj = {...filterObj, volunteer_status: req.body.volunteer_status};
		}

		let volunteerActivityList = await VolunteerActivity.model
			.find(filterObj)
			.limit(req.body.request_number)
			.populate('volunteer_accompany', '-user_agreement -user_interests')
			.exec();

		if (volunteerActivityList.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({status: 200, msg: volunteerActivityList});
	});
});

module.exports = router;
