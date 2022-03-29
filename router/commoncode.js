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

		result = await CommonCode.model
			.find(query, {_id: 0, common_code_value: 1, common_code_msg_kor: 1, common_code_msg_eng: 1, common_code_category: 1})
			.exec();

		//언어별 메시지 셋팅
		let common_code_msg = 'common_code_msg_' + query.common_code_language;

		//출력 형식이 관심분야 일 경우 아래와 같이 출력형식을 만든다.
		if (query.common_code_out_type == 'interests') {
			let result_object = {};
			for (let i = 0; i < result.length; i++) {
				if (result[i].common_code_category == 'topic') {
					result_object[result[i].common_code_value] = Object();
					//언어별 키값 생성을 위해 동적 키값 할당 적용(동적 키값 생성은 []를 이용)
					result_object[result[i].common_code_value].topic = result[i][common_code_msg];
				}
				//코드 정의(definition) 일경우 topic에서 생성된 하위단에 push 한 후, 출력형식 생성
				else if (result[i].common_code_category == 'definition') {
					if (result_object[result[i].common_code_value].definition == undefined) {
						result_object[result[i].common_code_value].definition = Array();
					}
					result_object[result[i].common_code_value].definition.push(result[i][common_code_msg]);
				}
			}
			result = result_object;
		}
		res.json({status: 200, msg: result});
	});
});
module.exports = router;
