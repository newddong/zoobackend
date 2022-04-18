const express = require('express');
const router = express.Router();
const Report = require('../schema/report');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');
const mongoose = require('mongoose');

function makeSchema(str) {
	let index = str.indexOf('object');
	return str.substr(0, index);
}

//신고하기 설정/취소
router.post('/createReport', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let report = await Report.model
			.findOneAndUpdate(
				{
					report_user_id: req.session.loginUser,
					report_target_object_id: req.body.report_target_object_id,
					report_target_object_type: req.body.report_target_object_type,
				},
				{
					$set: {
						report_user_id: req.session.loginUser,
						report_target_object_id: req.body.report_target_object_id,
						report_target_object_type: req.body.report_target_object_type,
						report_target_reason: req.body.report_target_reason,
						report_is_delete: req.body.report_is_delete,
					},
					$currentDate: {report_update_date: true},
				},
				{new: true, upsert: true},
			)
			.lean();

		res.json({status: 200, msg: report});
	});
});

//신고하기 정보 불러오기
router.post('/getReportInfo', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let report = await Report.model
			.findOne({report_user_id: req.session.loginUser, report_target_object_id: req.body.report_target_object_id})
			.lean();

		res.json({status: 200, msg: report});
	});
});

module.exports = router;
