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
			volunteer_accompany_number: req.body.volunteer_accompany_number, //신규추가
			volunteer_accompany: req.body.accompany_userobject_id_list, //
			volunteer_delegate_contact: req.body.volunteer_delegate_contact,
		});

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
			.populate('volunteer_target_shelter')
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

		//로그인한 유저가 일반 유저일 경우 허가되지 않음. (승인과 승인취소는 보호소가 진행.)
		if (userType == 'user' && ['notaccept', 'accept'].some(v => v == status)) {
			res.json({status: 400, msg: '해당 유저 타입에는 허가되지 않은 요청입니다.'});
			return;
		}
		//봉사 활동 cancel은 유저가 하는 것이며, 보호소는 신청승인안함(notaccept) status을 함.
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

//작업 진행 중
router.post('/setVolunteerActivityAccept', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		//봉사활동 내역서 해당 아이디로 존재 여부 확인
		let volunteerActivity = await VolunteerActivity.model.findById(req.body.volunteer_activity_object_id).exec();
		if (!volunteerActivity) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}
		let viewer = await User.model.findById(req.session.loginUser).exec();

		const userType = viewer.user_type;
		const statusList = ['accept', 'refuse'];
		const status = req.body.volunteer_status;

		//로그인한 유저가 보호소일 경우 해당 되지 않음.
		if (userType == 'shelter') {
			res.json({status: 400, msg: '해당 유저 타입에는 허가되지 않은 요청입니다.'});
			return;
		}

		//수락과 거부 status만 가능.
		if (!statusList.some(v => v == status)) {
			res.json({status: 400, msg: REQUEST_PARAMETER_NOT_VALID});
			return;
		}

		//세션 아이디와 동일한 아이디 값을 찾아 수락 여부에 따른 값 업데이트. (화면 확인 후 재작성)
		for (let i = 0; i < volunteerActivity.volunteer_member_confirm.length; i++) {
			if (volunteerActivity.volunteer_member_confirm[i].member == req.session.loginUser) {
				volunteerActivity.volunteer_member_confirm[i].confirm = status;
				break;
			}
		}

		await volunteerActivity.save();
		res.json({status: 200, msg: volunteerActivity});
	});
});

module.exports = router;
