const express = require('express');
const router = express.Router();
const CommonCode = require('../schema/commoncode');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');
const mongoose = require('mongoose');

//공통 코드 정보 생성
router.post('/createCommonCode', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let commoncode = await CommonCode.makeNewdoc({
			common_code_c_name: req.body.common_code_c_name,
			common_code_f_name: req.body.common_code_f_name,
			common_code_value: req.body.common_code_value,
			common_code_msg_kor: req.body.common_code_msg_kor,
			common_code_msg_eng: req.body.common_code_msg_eng,
			common_code_category: req.body.common_code_category,
			common_code_create_date: Date.now(),
			common_code_spare: req.body.common_code_spare,
		});

		let resultCommoncode = await commoncode.save();
		res.json({status: 200, msg: resultCommoncode});
	});
});

//공통 코드 정보 불러오기
router.post('/getCommonCodeDynamicQuery', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let query = {};
		for (let filed in req.body) {
			req.body[filed] !== '' ? (query[filed] = req.body[filed]) : null;
		}
		result = await CommonCode.model.find(query, {_id: 0, common_code_msg_kor: 1, common_code_msg_eng: 1, common_code_category: 1}).exec();
		res.json({status: 200, msg: result});
	});
});
module.exports = router;
