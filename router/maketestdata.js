const express = require('express');
const router = express.Router();
const Community = require('../schema/community');
const {controller, controllerLoggedIn} = require('./controller');
const mongoose = require('mongoose');

//커뮤니티 자유글 생성
router.post('/createCommunityFree', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let query = {};
		for (let filed in req.body) {
			req.body[filed] !== '' ? (query[filed] = req.body[filed]) : null;
		}
		dataNumber = query.data_number;
		writer = req.session.loginUser;
		title = query.community_title;
		type = query.community_type;
		free_type = query.community_free_type;

		qeuryArray = Array();

		for (let i = 0; i < dataNumber; i++) {
			query = {};
			query.community_title = '';
			query.community_writer_id = writer;
			query.community_type = type;
			query.community_free_type = free_type;

			if (i == dataNumber - 1) {
				query.community_title = title + ' -' + free_type + ' ' + i + '-end';
				query.community_content = title + ' -' + free_type + ' ' + i + '-end';
			} else {
				query.community_title = title + ' -' + free_type + ' ' + i;
				query.community_content = title + ' -' + free_type + ' ' + i;
			}
			query.community_date = Date.now();
			qeuryArray.push(query);
		}

		await Community.model.insertMany(qeuryArray);

		res.json({status: 200, msg: 'ok'});
	});
});

//커뮤니티 자유글 생성
router.post('/deleteCommunityFree', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		await Community.model.deleteMany({community_title: {$regex: req.body.community_title_for_delete}}).lean();
		res.json({status: 200, msg: 'ok'});
	});
});

module.exports = router;
