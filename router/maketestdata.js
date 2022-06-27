const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Community = require('../schema/community');
const {controller, controllerLoggedIn} = require('./controller');
const mongoose = require('mongoose');
const uploadS3 = require('../common/uploadS3');
var s3config = require('../common/awsconfig');
var AWS = require('aws-sdk');
var mime = require('mime-types');

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

//테스트 값 얻어오기
router.post('/doTest', (req, res) => {
	controller(req, res, async () => {
		// console.log('process.env=>', process.env['ANILOG_SERVERURL']);
		const fs = require('fs');
		const request = require('request');
		var download = function (uri, filename, callback) {
			request.head(uri, function (err, res, body) {
				request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
			});
		};
		let url = 'http://www.animal.go.kr/files/shelter/2022/06/202206231806145_s.jpg';
		let image_path = './images/202206231806146_s.jpg';
		// download(url, './images/202206231806145_s.jpg', function () {
		// 	console.log('done');
		// 	console.log(uploadS3.single('./images/202206231806145_s.jpg'));
		// });
		// request.head(url, function (err, res, body) {
		// 	request(url).pipe(fs.createWriteStream(image_path));
		// });

		s3 = new AWS.S3(s3config);
		var uploadParams = {Bucket: process.env.ANILOG_S3BUCKET, Key: '', Body: ''};
		var file = image_path;
		var fileStream = fs.createReadStream(image_path);
		fileStream.on('error', function (err) {
			console.log('File Error', err);
		});
		uploadParams.Body = fileStream;
		var path = require('path');
		uploadParams.Key = `upload/${Date.now()}_${path.basename(image_path)}`;
		uploadParams.acl = 'public-read';

		// call S3 to retrieve upload file to specified bucket
		s3.upload(uploadParams, function (err, data) {
			if (err) {
				console.log('Error', err);
			}
			if (data) {
				console.log('Upload Success', data.Location);
			}
		});

		// fs.readFile(image_path, function (err, data) {
		// 	s3.putObject(
		// 		{
		// 			Bucket: s3config.bucket,
		// 			Key: image_path,
		// 			Body: data,
		// 		},
		// 		function (err, resp) {
		// 			if (err) {
		// 				console.log('error in s3 put object cb');
		// 			} else {
		// 				console.log(resp);
		// 				console.log('successfully added image to s3');
		// 			}
		// 		},
		// 	);
		// });

		res.json({status: 200, msg: ''});
	});
});

module.exports = router;
