const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Feed = require('../schema/feed');
const Hash = require('../schema/hash');
const HashFeed = require('../schema/hashfeed');
const FeedUserTag = require('../schema/feedusertag');
const uploadS3 = require('../common/uploadS3');
const {controller, controllerLoggedIn} = require('./controller');
const {USER_NOT_FOUND, ALERT_NOT_VALID_USEROBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MEDIA_INFO, ALERT_NOT_VALID_OBJECT_ID} = require('./constants');

//피드 글쓰기
router.post('/createFeed', uploadS3.array('media_uri'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let feed = await Feed.makeNewdoc({
			feed_content: req.body.feed_content,
			feed_location: req.body.feed_location,
			feed_type: 'feed',
			feed_writer_id: req.session.loginUser,
			feed_is_protect_diary: req.body.feed_is_protect_diary,
		});

		if (req.body.feed_avatar_id) {
			feed.feed_avatar_id = req.body.feed_avatar_id;
		}

		if (req.files && req.files.length > 0) {
			let feedMedia = typeof req.body.feed_medias == 'string' ? JSON.parse(req.body.feed_medias) : req.body.feed_medias;

			feed.feed_medias = req.files.map((v, i) => {
				let result = feedMedia[i];
				result.media_uri = v.location;
				return result;
			});
			feed.feed_thumbnail = feed.feed_medias[0].media_uri;

			feed.feed_medias.forEach(v => {
				v.tags.forEach(v => {
					createUserTag(v.user, feed);
				});
			});
		}

		let newFeed = await feed.save();

		let hashTags =
			typeof req.body.hashtag_keyword == 'string' ? req.body.hashtag_keyword.replace(/[\[\]\"]/g, '').split(',') : req.body.hashtag_keyword;
		if (hashTags) {
			hashTags.forEach(hashKeyword => {
				createHash(hashKeyword, feed._id);
			});
		}
		await User.model.findOneAndUpdate({_id: req.session.loginUser}, {$inc: {user_upload_count: 1}});
		res.json({status: 200, msg: newFeed});
	});
});

async function createHash(hashKeyword, documentId) {
	let hash = await Hash.model
		.findOneAndUpdate(
			{hashtag_keyword: hashKeyword},
			{$set: {hashtag_keyword: hashKeyword}, $inc: {hashtag_feed_count: 1}},
			{new: true, upsert: true},
		)
		.exec();
	let hashfeed = await HashFeed.makeNewdoc({
		hashtag_id: hash._id,
		hashtag_feed_id: documentId,
		hashtag_protect_request_id: documentId,
	});
	hashfeed.save();
}

async function deleteHash(hashKeyword, documentId) {
	let hash = await Hash.model
		.findOneAndUpdate(
			{hashtag_keyword: hashKeyword},
			{$set: {hashtag_keyword: hashKeyword}, $inc: {hashtag_feed_count: -1}},
			{new: true},
		)
		.exec();
	await HashFeed.model.deleteOne({
		hashtag_id : hash._id,
		hashtag_feed_id: documentId
	})
}

async function createUserTag(user, feed) {
	let feedUserTag = await FeedUserTag.makeNewdoc({
		type: 'FeedUserTagObject',
		usertag_feed_id: feed._id,
		usertag_protect_request_id: feed._id,
		usertag_user_id: user._id,
	});
	feedUserTag.save();
}

//실종 게시물 쓰기
router.post('/createMissing', uploadS3.array('media_uri'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let missing = await Feed.makeNewdoc({
			feed_content: req.body.feed_content,
			feed_location: req.body.feed_location,
			feed_type: 'missing',
			feed_writer_id: req.session.loginUser,

			missing_animal_age: req.body.missing_animal_age,
			missing_animal_features: req.body.missing_animal_features,
			missing_animal_contact: req.body.missing_animal_contact,
			missing_animal_lost_location: req.body.missing_animal_lost_location,
			missing_animal_sex: req.body.missing_animal_sex,
			missing_animal_species: req.body.missing_animal_species,
			missing_animal_species_detail: req.body.missing_animal_species_detail,
			missing_animal_date: req.body.missing_animal_date,
		});

		if (req.files && req.files.length > 0) {
			let feedMedia = typeof req.body.feed_medias == 'string' ? JSON.parse('[' + req.body.feed_medias + ']') : req.body.feed_medias;

			missing.feed_medias = req.files.map((v, i) => {
				return {
					...feedMedia[i],
					media_uri: v.location,
				};
			});
			missing.feed_thumbnail = missing.feed_medias[0].media_uri;
		}

		let newMissing = await missing.save();

		let hashTags =
			typeof req.body.hashtag_keyword == 'string' ? req.body.hashtag_keyword.replace(/[\[\]\"]/g, '').split(',') : req.body.hashtag_keyword;
		if (hashTags) {
			hashTags.forEach(hashKeyword => {
				createHash(hashKeyword, missing._id);
			});
		}

		await User.model.findOneAndUpdate({_id: req.session.loginUser}, {$inc: {user_upload_count: 1}});
		res.json({status: 200, msg: newMissing});
	});
});

//제보 게시물 쓰기
router.post('/createReport', uploadS3.array('media_uri'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let report = await Feed.makeNewdoc({
			feed_content: req.body.feed_content,
			feed_location: req.body.feed_location,
			feed_type: 'report',
			feed_writer_id: req.session.loginUser,
			report_animal_species: req.body.report_animal_species,
			report_animal_features: req.body.report_animal_features,
			report_witness_date: req.body.report_witness_date,
			report_witness_location: req.body.report_witness_location,
		});

		if (req.files && req.files.length > 0) {
			let feedMedia = typeof req.body.feed_medias == 'string' ? JSON.parse('[' + req.body.feed_medias + ']') : req.body.feed_medias;

			report.feed_medias = req.files.map((v, i) => {
				return {
					...feedMedia[i],
					media_uri: v.location,
				};
			});
			report.feed_thumbnail = report.feed_medias[0].media_uri;
		}

		let newReport = await report.save();

		let hashTags =
			typeof req.body.hashtag_keyword == 'string' ? req.body.hashtag_keyword.replace(/[\[\]\"]/g, '').split(',') : req.body.hashtag_keyword;
		if (hashTags) {
			hashTags.forEach(hashKeyword => {
				createHash(hashKeyword, report._id);
			});
		}

		await User.model.findOneAndUpdate({_id: req.session.loginUser}, {$inc: {user_upload_count: 1}});
		res.json({status: 200, msg: newReport});
	});
});

//특정 유저가 작성한 피드 리스트를 불러온다.
router.post('/getFeedListByUserId', (req, res) => {
	controller(req, res, async () => {
		let user = await User.model.findById(req.body.userobject_id);
		if (!user) {
			//res.status(400);
			res.json({status: 400, msg: ALERT_NOT_VALID_USEROBJECT_ID});
			return;
		}
		if (user.user_type == 'pet') {
			let petFeeds = await Feed.model
				.find({feed_avatar_id: req.body.userobject_id})
				.populate('feed_avatar_id')
				.limit(req.body.request_number)
				.sort('-_id')
				.exec();
			if (petFeeds.length < 1) {
				//res.status(404);
				res.json({status: 404, user_type: 'pet', msg: ALERT_NO_RESULT});
				return;
			}
			//res.status(200);
			res.json({status: 200, user_type: 'pet', msg: petFeeds});
			return;
		} else {
			let userFeeds = await Feed.model
				.find({feed_writer_id: req.body.userobject_id})
				.populate('feed_writer_id')
				.limit(req.body.request_number)
				.sort('-_id')
				.exec();
			if (userFeeds < 1) {
				//res.status(404);
				res.json({status: 404, user_type: user.user_type, msg: ALERT_NO_RESULT});
				return;
			}
			//res.status(200);
			res.json({status: 200, user_type: user.user_type, msg: userFeeds});
			return;
		}
	});
});

//특정 유저가 태그된 피드 목록을 불러온다.
router.post('/getUserTaggedFeedList', (req, res) => {
	controller(req, res, async () => {
		let user = await User.model.findById(req.body.userobject_id);
		if (!user) {
			//res.status(400);
			res.json({status: 400, msg: ALERT_NOT_VALID_USEROBJECT_ID});
			return;
		}

		let taggedFeeds = await FeedUserTag.model
			.find({
				usertag_user_id: user._id,
			})
			.populate('usertag_feed_id')
			.sort('-id')
			.exec();
		if (taggedFeeds.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}
		res.json({status: 200, msg: taggedFeeds});
		return;
	});
});

//실종/제보 요청을 가져온다.
router.post('/getMissingReportList', (req, res) => {
	controller(req, res, async () => {
		let reportMissingList = Feed.model.find({feed_type: {$ne: 'feed'}}).populate('feed_writer_id');
		if (req.body.city) {
			reportMissingList.find({
				$or: [{missing_animal_lost_location: {$regex: req.body.city}}, {report_witness_location: {$regex: req.body.city}}],
			});
		}
		if (req.body.missing_animal_species) {
			reportMissingList.find({
				$or: [
					{missing_animal_species: {$regex: req.body.missing_animal_species}},
					{report_animal_species: {$regex: req.body.missing_animal_species}},
				],
			});
		}

		reportMissingList = await reportMissingList.sort('-_id').exec();
		if (reportMissingList.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({status: 200, msg: reportMissingList});
	});
});

//피드,실종,제보 게시글 상세정보 가져오기
router.post('/getFeedDetailById', (req, res) => {
	controller(req, res, async () => {
		let feed = await Feed.model.findById(req.body.feedobject_id).populate('feed_writer_id').exec();
		if (!feed) {
			//res.status(404);
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		//res.status(200);
		res.json({status: 200, msg: feed});
	});
});

//추천 피드 리스트를 불러옴(홈화면)
router.post('/getSuggestFeedList', (req, res) => {
	controller(req, res, async () => {
		let feed = await Feed.model.find().populate('feed_writer_id').populate('feed_avatar_id').sort('-_id').lean();
		if (!feed) {
			//res.status(404);
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}
		// let recentFeeds = feed.slice(0,4);
		// let randomFeeds = feed.slice(5);
		// randomFeeds.sort(()=>Math.random()-0.5);//섞음
		// let result = recentFeeds.concat(randomFeeds);
		let result = feed;
		//res.status(200);
		res.json({status: 200, msg: result});
	});
});

//피드 수정
router.post('/editFeed', uploadS3.array('media_uri'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let targetFeed = await Feed.model.findById(req.body.feedobject_id);
		if (!targetFeed) {
			res.json({status: 404, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}
		targetFeed.feed_content = req.body.feed_content;
		targetFeed.feed_location = req.body.feed_location;
		targetFeed.feed_type = 'feed';
		targetFeed.feed_is_protect_diary = req.body.feed_is_protect_diary;

		let feedMedias = typeof req.body.feed_medias == 'string' ? JSON.parse(req.body.feed_medias) : req.body.feed_medias;
		console.log(feedMedias);

		if (req.files && req.files.length > 0) {
			targetFeed.feed_medias = feedMedias.map(media => {
				let uri = req.files.find(file => media.media_uri.includes(file.originalname));
				if(uri){
					return {...media,
						media_uri: uri.location,
					};
				}else{
					return media;
				}
			});
		}

		let hashTags = typeof req.body.hashtag_keyword == 'string' ? req.body.hashtag_keyword.replace(/[\[\]\"]/g, '').split(',') : req.body.hashtag_keyword;
		let previousHashes = await HashFeed.model.find({hashtag_feed_id:targetFeed._id}).populate('hashtag_id').exec();

		hashTags.forEach(hash=>{
			if(!previousHashes.find(prev => prev.hashtag_id.hashtag_keyword == hash)){
				createHash(hash, targetFeed._id);
			}
		})

		previousHashes.forEach( prev=>{
			if(!hashTags.find(hash => prev.hashtag_id.hashtag_keyword == hash)){
				deleteHash(prev.hashtag_id.hashtag_keyword, targetFeed._id);
			}
		})








		targetFeed.feed_thumbnail = targetFeed.feed_medias[0].media_uri;
		await targetFeed.save();
		res.json({status: 200, msg: 'edit success'});
	});
});

module.exports = router;
