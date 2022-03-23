const express = require('express');
const router = express.Router();
const HelpByCategory = require('../schema/helpbycategory');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');
const mongoose = require('mongoose');

//카테고리 도움말 생성
router.post('/createHelpByCategory', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let helpByCategory = await HelpByCategory.makeNewdoc({
			help_by_category_common_code_id: req.body.help_by_category_common_code_id,
			help_by_category_title: req.body.help_by_category_title,
			help_by_category_contents: req.body.help_by_category_contents,
		});

		let resultHelpByCategory = await helpByCategory.save();
		res.json({status: 200, msg: resultHelpByCategory});
	});
});

//카테고리 도움말 불러오기
router.post('/getHelpByCategoryDynamicQuery', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let query = {};
		for (let filed in req.body) {
			req.body[filed] !== '' ? (query[filed] = req.body[filed]) : null;
		}

		result = await HelpByCategory.model
			.find(query)
			.populate({path: 'help_by_category_common_code_id', select: 'common_code_msg_kor common_code_msg_eng'})
			.exec();
		res.json({status: 200, msg: result});
	});
});

//카테고리 제목 검색
router.post('/getSearchHelpByCategoryList', (req, res) => {
	controller(req, res, async () => {
		let keyword = req.body.searchKeyword;

		helpByCategoryList = await HelpByCategory.model.find({help_by_category_title: {$regex: keyword}}).lean();

		if (helpByCategoryList.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}
		res.json({status: 200, msg: helpByCategoryList});
	});
});

module.exports = router;
