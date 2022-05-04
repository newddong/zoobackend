const express = require('express');
const router = express.Router();
const QandA = require('../schema/qanda');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');
const mongoose = require('mongoose');

//문의하기 생성
router.post('/createQandA', (req, res) => {
	// controller(req, res, async () => {
	// 	let qandA = await QandA.makeNewdoc({
	// 		qanda_common_code_id: req.body.qanda_common_code_id,
	// 		// qanda_user_id: req.session.loginUser,
	// 		// qanda_status: 'waiting',
	// 		qanda_question_title: req.body.qanda_question_title,
	// 		qanda_question_contents: req.body.qanda_question_contents,
	// 		qanda_question_date: Date.now(),
	// 	});

	// 	let resultQandA = await qandA.save();
	// 	res.json({status: 200, msg: resultQandA});
	// });

	controller(req, res, async () => {
		let query = {};

		//받은 파라미터 확인
		for (let filed in req.body) {
			req.body[filed] !== '' ? (query[filed] = req.body[filed]) : null;
		}

		if (req.session.loginUser) {
			query.qanda_user_id = req.session.loginUser;
		}
		query.qanda_question_date = Date.now();
		query.qanda_status = 'waiting';

		let qandAmake = await QandA.makeNewdoc(query);
		let resultQandAmake = await qandAmake.save();
		res.json({status: 200, msg: resultQandAmake});
	});
});

//문의하기 정보 불러오기
router.post('/getQandInfo', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let query = {};
		for (let filed in req.body) {
			req.body[filed] !== '' ? (query[filed] = req.body[filed]) : null;
		}
		result = await QandA.model
			.find(query)
			.populate({path: 'qanda_common_code_id', select: 'common_code_msg_kor common_code_msg_eng'})
			.where('qanda_is_delete')
			.ne(true)
			.exec();
		res.json({status: 200, msg: result});
	});
});

//문의하기 수정(사용자)
router.post('/updateQandAWithUser', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		const fields = Object.keys(req.body);
		const query = {};

		for (let i = 0; i < fields.length; i++) {
			if (fields[i] == 'qanda_object_id' || Object.values(req.body)[i] == '') continue;
			query[fields[i]] = Object.values(req.body)[i];
		}
		query.qanda_question_update_date = Date.now();
		QandA.model.updateOne(
			{
				_id: req.body.qanda_object_id,
			},
			{
				$set: query,
			},
			function (err, success) {
				if (err) throw err;
				else {
					res.send({
						status: 200,
						msg: 'update success',
					});
				}
			},
		);
	});
});

//문의하기 삭제
router.post('/deleteQandA', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		const fields = Object.keys(req.body);
		const query = {};

		//삭제시 필요한 정보 기입
		query.qanda_delete_user_id = req.session.loginUser;
		query.qanda_delete_date = Date.now();
		query.qanda_is_delete = true;

		//배열로 받은 삭제할 문의하기 글들을 split 시킴
		objectArray = req.body.qanda_object_id.split(',');
		made_Array_objectid = new Array();

		//find 검색의 in 조건절로 넣어주기 위해 mongoose.Types.ObjectId 데이터 형의 Array를 만들어 준다.
		for (let i = 0; i < objectArray.length; i++) {
			made_Array_objectid.push(mongoose.Types.ObjectId(objectArray[i]));
		}

		let resultQandA = await QandA.model.find().where('_id').in(made_Array_objectid).updateMany({$set: query}).sort('-_id').exec();
		res.json({status: 200, msg: resultQandA});
	});
});

//문의하기 답변달기 및 수정하기
router.post('/updateQandAWithAdmin', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		const fields = Object.keys(req.body);
		const query = {};

		for (let i = 0; i < fields.length; i++) {
			if (fields[i] == 'qanda_object_id' || Object.values(req.body)[i] == '') continue;
			query[fields[i]] = Object.values(req.body)[i];
		}
		query.qanda_answer_date = Date.now();
		QandA.model.updateOne(
			{
				_id: req.body.qanda_object_id,
			},
			{
				$set: query,
			},
			function (err, success) {
				if (err) throw err;
				else {
					res.send({
						status: 200,
						msg: 'update success',
					});
				}
			},
		);
	});
});

module.exports = router;
