const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Community = require('../schema/community');
const Feed = require('../schema/feed');
const FavoriteFeed = require('../schema/favoritefeed');
const {controller, controllerLoggedIn} = require('./controller');
const mongoose = require('mongoose');
const uploadS3 = require('../common/uploadS3');
var s3config = require('../common/awsconfig');
var AWS = require('aws-sdk');
var mime = require('mime-types');
const ProtectRequest = require('../schema/protectrequest');

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

//커뮤니티 자유글 삭제
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

async function randomNum(min, max) {
	let randNum = Math.floor(Math.random() * (max - min + 1)) + min;
	return randNum;
}

//실종/제보글 생성
router.post('/createMissingReport', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let query = {};
		let making_query = {};
		for (let filed in req.body) {
			req.body[filed] !== '' ? (query[filed] = req.body[filed]) : null;
		}
		let FEED_TYPE_MISSING = 1;
		let FEED_TYPE_REPORT = 2;
		let ran_feed_type;

		dataNumber = query.data_number;
		writer = req.session.loginUser;
		title = query.feed_content;
		feed_type_create = query.feed_type_create;
		feed_location = '과천시';
		qeuryArray = Array();
		for (let i = 0; i < dataNumber; i++) {
			making_query = {};
			making_query.feed_writer_id = writer;
			let feedMedia = Array();
			mediaobject = {};
			ran_feed_type = 0;
			switch (feed_type_create) {
				case 'random':
					ran_feed_type = await randomNum(1, 2);
					break;
				case 'missing':
					ran_feed_type = 1;
					break;
				case 'report':
					ran_feed_type = 2;
					break;
			}
			if (ran_feed_type == FEED_TYPE_MISSING) {
				feed_type = 'missing';
				making_query.missing_animal_age = 1;
				making_query.missing_animal_features = '털이 많음';
				making_query.missing_animal_contact = '01012341234';
				making_query.missing_animal_lost_location = '{"city":"강원도","district":"고성군","detail":"ㅣ"}';
				making_query.missing_animal_sex = 'female';
				making_query.missing_animal_species = '개';
				making_query.missing_animal_species_detail = '꼴불견';
				making_query.missing_animal_date = new Date();
				mediaobject.media_uri = 'https://pinetreegy.s3.ap-northeast-2.amazonaws.com/upload/1652333325744_C9976EF8-1558-4FE6-99AA-C930CDA95E24.jpg';
				feedMedia.push(mediaobject);
				making_query['feed_medias'] = feedMedia;
			} else {
				feed_type = 'report';
				making_query.report_animal_species = '개';
				making_query.report_animal_features = '착하게 생김';
				making_query.report_witness_date = new Date();
				making_query.report_witness_location = '경기도 수원시 권선구';
				mediaobject.media_uri = 'https://pinetreegy.s3.ap-northeast-2.amazonaws.com/upload/1652333325744_C9976EF8-1558-4FE6-99AA-C930CDA95E24.jpg';
				feedMedia.push(mediaobject);
				making_query['feed_medias'] = feedMedia;
			}

			making_query.feed_thumbnail =
				'https://pinetreegy.s3.ap-northeast-2.amazonaws.com/upload/1652333325744_C9976EF8-1558-4FE6-99AA-C930CDA95E24.jpg';
			making_query.feed_date = new Date();
			making_query.feed_type = feed_type;

			if (i == dataNumber - 1) {
				making_query.feed_content = title + ' -' + feed_type + ' ' + i + '-end';
				making_query.feed_content = title + ' -' + feed_type + ' ' + i + '-end';
			} else {
				making_query.feed_content = title + ' -' + feed_type + ' ' + i;
				making_query.feed_content = title + ' -' + feed_type + ' ' + i;
			}
			making_query.feed_date = Date.now();
			qeuryArray.push(making_query);
		}

		await Feed.model.insertMany(qeuryArray);

		res.json({status: 200, msg: 'ok'});
	});
});

//실종/제보글 삭제
router.post('/deleteMissingReport', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		await Feed.model.deleteMany({feed_content: {$regex: req.body.feed_content_for_delete}}).lean();
		res.json({status: 200, msg: 'ok'});
	});
});

//즐겨찾기 한 게시물이 존재하는 데이터 출력
router.post('/findFavoriteDataDeleted', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let feedlist = await FavoriteFeed.model.find({}).lean();
		let match_query = {};
		match_query['favorite_feed_id'] = {$ne: []};

		favoritefeedlist = await FavoriteFeed.model.aggregate([
			//데이터가 ObjectId로 안되어 있고 단순 string 일때 반드시 addFields를 통해 toObjectId를 진행하도록 한다.
			{$addFields: {favorite_feed_id: {$toObjectId: '$favorite_feed_id'}}},
			{
				$lookup: {
					from: 'feedobjects',
					localField: 'favorite_feed_id',
					foreignField: '_id',
					as: 'favorite_feed_id',
				},
			},
			{
				$unwind: '$favorite_feed_id',
			},
			{
				$match: match_query,
			},
		]);

		console.log('favoritefeedlist=>', favoritefeedlist);

		res.json({status: 200, msg: 'ok'});
	});
});

//즐겨찾기한 게시물이 존재하지 않을 경우 삭제
router.post('/deleteFavoriteDataDleted', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let feedlist = await FavoriteFeed.model.find({}).lean();
		let match_query = {};
		match_query['favorite_feed_id'] = {$ne: []};

		favoritefeedlist = await FavoriteFeed.model.aggregate([
			//데이터가 ObjectId로 안되어 있고 단순 string 일때 반드시 addFields를 통해 toObjectId를 진행하도록 한다.
			{$addFields: {favorite_feed_id: {$toObjectId: '$favorite_feed_id'}}},
			{
				$lookup: {
					from: 'feedobjects',
					localField: 'favorite_feed_id',
					foreignField: '_id',
					as: 'favorite_feed_id',
				},
			},
			{
				$unwind: '$favorite_feed_id',
			},
			{
				$match: match_query,
			},
		]);

		let tempArray = Array();
		for (let i = 0; i < favoritefeedlist.length; i++) {
			tempArray.push(favoritefeedlist[i]._id);
		}
		console.log(tempArray);
		await FavoriteFeed.model.deleteMany({_id: {$nin: tempArray}}).lean();
		res.json({status: 200, msg: 'ok'});
	});
});

async function dateFormatForBetween(str) {
	let year = str.substr(0, 4);
	let month = str.substr(4, 2);
	let day = str.substr(6);
	return year + '-' + month + '-' + day;
}

//동물보호 수집 날짜별 카운트 진행 - 작성중s
router.post('/deleteMissingReport', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		date_notice_sdt = new Date(await dateFormatForBetween(notice_sdt));
		date_notice_edt = new Date(await dateFormatForBetween(notice_edt));
		send_query['protect_request_date'] = {$gte: date_notice_sdt, $lte: date_notice_edt};

		await ProtectRequest.model
			.find({user_register_date: {$gte: ISODate('2022-07-12'), $lt: ISODate('2022-07-11')}})
			.count()
			.lean();
	});
});

//피드에서 최신 댓글 노출
router.post('/deleteRecentComment', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let result = await Feed.model.update({}, {$unset: {feed_recent_comment: true}}).exec();
		res.json({status: 200, msg: 'ok'});
	});
});

module.exports = router;
