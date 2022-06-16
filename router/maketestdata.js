const express = require('express');
const router = express.Router();
const User = require('../schema/user');
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

//사용자 관심도 에러 수정(기존 배열 데이터 타입을 오브젝트로 변경)
router.post('/updateUserInterestsToNoError', (req, res) => {
	controller(req, res, async () => {
		let test1 = Array();
		test1.push('111');
		let test2 = {};
		test2['col1'] = '111';
		let userList = await User.model.find({}).lean();
		let needToUpdateIdList = Array();
		for (let i = 0; i < userList.length; i++) {
			if (userList[i].user_interests instanceof Object && userList[i].user_interests instanceof Array) {
				needToUpdateIdList.push(userList[i]._id);
			}
		}
		let result = await User.model
			.find()
			.where('_id')
			.in(needToUpdateIdList)
			.updateMany({$set: {user_interests: {}}})
			.lean();

		res.json({status: 200, msg: 'ok'});
	});
});

async function splitPicNumForOrder(str) {
	let picnumArray = str.split('/');
	console.log('picnumArray[7]', picnumArray[7].replace('_s.jpg', ''));
	return picnumArray[7].replace('_s.jpg', '');
}

//사용자 관심도 에러 수정(기존 배열 데이터 타입을 오브젝트로 변경)
router.post('/testConfirm', (req, res) => {
	controller(req, res, async () => {
		let data = 'http://www.animal.go.kr/files/shelter/2022/05/202205300905963_s.jpg';
		let result = await splitPicNumForOrder(data);
		console.log('result=>', result);

		res.json({status: 200, msg: result});
	});
});

module.exports = router;
