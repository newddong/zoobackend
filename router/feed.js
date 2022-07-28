const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Feed = require('../schema/feed');
const Hash = require('../schema/hash');
const HashFeed = require('../schema/hashfeed');
const FeedUserTag = require('../schema/feedusertag');
const FavoriteFeed = require('../schema/favoritefeed');
const LikeFeed = require('../schema/likefeed');
const Notice = require('../schema/notice');
const NoticeUser = require('../schema/noticeuser');
const FavoriteEtc = require('../schema/favoriteetc');
const Community = require('../schema/community');
const uploadS3 = require('../common/uploadS3');
const Follow = require('../schema/follow');
const ProtectRequest = require('../schema/protectrequest');
const {controller, controllerLoggedIn} = require('./controller');
const {USER_NOT_FOUND, ALERT_NOT_VALID_USEROBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MEDIA_INFO, ALERT_NOT_VALID_OBJECT_ID} = require('./constants');
const mongoose = require('mongoose');

//피드 글쓰기
router.post('/createFeed', uploadS3.array('media_uri'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let feed = await Feed.makeNewdoc({
			feed_content: req.body.feed_content,
			// feed_location: req.body.feed_location,
			feed_type: 'feed',
			feed_writer_id: req.session.loginUser,
			feed_is_protect_diary: req.body.feed_is_protect_diary,
			feed_public_type: req.body.feed_public_type,
		});

		feed.feed_location = typeof req.body.feed_location == 'string' ? JSON.parse(req.body.feed_location) : req.body.feed_location;
		if (req.body.feed_avatar_id) {
			feed.feed_avatar_id = req.body.feed_avatar_id;
		}

		if (req.files && req.files.length > 0) {
			let feedMedia = typeof req.body.feed_medias == 'string' ? JSON.parse(req.body.feed_medias) : req.body.feed_medias;

			feed.feed_medias = req.files
				.map((v, i) => {
					if (i > feedMedia.length - 1) return false;
					let result = feedMedia[i];
					if (result) {
						result.media_uri = v.location;
					}
					return result;
				})
				.filter(v => v);

			if (req.files.length > feed.feed_medias.length) {
				feed.feed_thumbnail = req.files[req.files.length - 1].location;
			} else {
				feed.feed_thumbnail = feed.feed_medias[0].media_uri;
			}

			feed.feed_medias.forEach(v => {
				v.tags.forEach(v => {
					createUserTag(v.user, feed, req.session.loginUser);
				});
			});
		}

		let newFeed = await feed.save();
		let hashList = Array();
		let cnt = 0;
		let hashTags =
			typeof req.body.hashtag_keyword == 'string' ? req.body.hashtag_keyword.replace(/[\[\]\"]/g, '').split(',') : req.body.hashtag_keyword;
		if (hashTags) {
			hashTags.forEach(hashKeyword => {
				createHash(hashKeyword, feed._id).then(function (data) {
					cnt++;
					hashList.push(data._id);
					if (cnt == hashTags.length) {
						//해시태그 추가시 feed_hashtag_member 배열 필드에 추가
						Feed.model.findOneAndUpdate({_id: feed._id}, {$set: {feed_hashtag_member: hashList}}, {new: true, upsert: true}).exec();
					}
				});
			});
		}
		// await User.model.findOneAndUpdate({_id: req.session.loginUser}, {$inc: {user_upload_count: 1}});

		//업로드 게시물 개수 업데이트
		let writer_id;
		if (req.body.feed_avatar_id) {
			writer_id = req.body.feed_avatar_id;
		} else {
			writer_id = req.session.loginUser;
		}
		let feedCount = await Feed.model
			.find({
				$and: [{feed_type: 'feed'}, {feed_avatar_id: writer_id}],
			})
			.where('feed_is_delete')
			.ne(true)
			.count()
			.lean();

		let report_missingCount = await Feed.model
			.find({
				$and: [{feed_type: {$in: ['report', 'missing']}}, {feed_writer_id: writer_id}],
			})
			.where('feed_is_delete')
			.ne(true)
			.count()
			.lean();

		let protectRequestCount = await ProtectRequest.model
			.find({protect_request_writer_id: writer_id})
			.where('protect_request_is_delete')
			.ne(true)
			.count()
			.lean();

		let communityCount = await Community.model.find({community_writer_id: writer_id}).where('community_is_delete').ne(true).count();
		let totalCount = feedCount + report_missingCount + protectRequestCount + communityCount;

		let countUpdate = await User.model
			.findOneAndUpdate(
				{
					_id: writer_id,
				},
				{
					$set: {
						user_upload_count: totalCount,
					},
					$currentDate: {feed_update_date: true},
				},
				{new: true, upsert: true},
			)
			.lean();

		res.json({status: 200, msg: newFeed});
	});
});

async function createHash(hashKeyword, documentId) {
	//키워드로 hash_id를 얻어온다.
	let hash_id = await Hash.model.findOne({hashtag_keyword: hashKeyword}).select('_id').lean();
	let hashfeed;
	if (hash_id != null) {
		//HashTagFeedObject 컬렉션에 키워드에 해당되는 hash insert 함.
		hashfeed = await HashFeed.makeNewdoc({
			hashtag_id: hash_id._id,
			hashtag_feed_id: documentId,
			hashtag_protect_request_id: documentId,
		});

		//hash_id로 현재 추가된 개수까지 카운트 해옴.
		let hashCnt = await HashFeed.model.find({hashtag_id: hash_id}).where('hashtag_is_delete').ne(true).count().exec();
		// let hash = await Hash.model
		// 	.findOneAndUpdate(
		// 		{hashtag_keyword: hashKeyword},
		// 		{$set: {hashtag_keyword: hashKeyword}, $inc: {hashtag_feed_count: 1}},
		// 		{new: true, upsert: true},
		// 	)
		// 	.exec();

		//올바르게 카운트한 값을 업데이트 시킴
		let hash = await Hash.model
			.findOneAndUpdate({hashtag_keyword: hashKeyword}, {$set: {hashtag_keyword: hashKeyword, hashtag_feed_count: hashCnt + 1}}, {new: true})
			.exec();
	} else {
		//기존에 Hash가 존재하지 않을 경우 새롭게 insert 시킨다.
		let hash = await Hash.model
			.findOneAndUpdate({hashtag_keyword: hashKeyword}, {$set: {hashtag_keyword: hashKeyword, hashtag_feed_count: 1}}, {new: true, upsert: true})
			.exec();
		//HashTagFeedObject 컬렉션에 키워드에 해당되는 hash insert 함.
		hashfeed = await HashFeed.makeNewdoc({
			hashtag_id: hash._id,
			hashtag_feed_id: documentId,
			hashtag_protect_request_id: documentId,
		});
	}

	//결과값을 내보내기 위해 Promise와 resolve를 이용
	let resultHashFeed = await hashfeed.save();
	return new Promise(function (resolve, reject) {
		resolve(resultHashFeed);
	});
}

async function deleteHash(hashKeyword, documentId, deleted_id) {
	// let hash = await Hash.model
	// 	.findOneAndUpdate({hashtag_keyword: hashKeyword}, {$set: {hashtag_keyword: hashKeyword}, $inc: {hashtag_feed_count: -1}}, {new: true})
	// 	.exec();

	// await HashFeed.model.deleteOne({
	// 	hashtag_id: hash._id,
	// 	hashtag_feed_id: documentId,
	// });

	//해시가 삭제되면 hashtag_is_delete 필드를 true로 수정
	let hash = await HashFeed.model.findOneAndUpdate({_id: deleted_id}, {$set: {hashtag_is_delete: true}}).exec();

	// $inc -1로 진행할 경우 시간이 흐르면 오차 발행. 반드시 count로 업데이트 필요
	let cnt = await Hash.model.findById({_id: hash.hashtag_id}).count().lean();
	let hashValue = await Hash.model.findOneAndUpdate({_id: hash.hashtag_id}, {$set: {hashtag_feed_count: cnt - 1}}, {new: true}).exec();
}
async function deleteHashArray(hashKeyword, documentId, deleteHashList) {
	// let hash = await Hash.model
	// 	.findOneAndUpdate({hashtag_keyword: hashKeyword}, {$set: {hashtag_keyword: hashKeyword}, $inc: {hashtag_feed_count: -1}}, {new: true})
	// 	.exec();

	//삭제된 해시태그에 대해서 HashTagFeedObject 컬렉션에서 해당 피드에 존재하는 해시태그 삭제필드를 true로 변경
	await HashFeed.model
		.find({_id: {$in: deleteHashList}})
		.updateMany({$set: {hashtag_is_delete: true}})
		.lean();

	let hashCnt = await HashFeed.model.find({hashtag_feed_id: documentId}).where('hashtag_is_delete').ne(true).count().exec();

	//올바르게 카운트한 값을 업데이트 시킴
	let hash = await Hash.model
		.findOneAndUpdate({hashtag_keyword: hashKeyword}, {$set: {hashtag_keyword: hashKeyword, hashtag_feed_count: hashCnt}}, {new: true, upsert: true})
		.exec();

	await HashFeed.model.deleteOne({
		hashtag_id: hash._id,
		hashtag_feed_id: documentId,
	});
}

async function createUserTag(user, feed, loginUser) {
	let feedUserTag = await FeedUserTag.makeNewdoc({
		type: 'FeedUserTagObject',
		usertag_feed_id: feed._id,
		usertag_protect_request_id: feed._id,
		usertag_user_id: user._id,
	});

	writer_id = user._id;
	await feedUserTag.save();

	//알림 내역에 태그 관련 insert
	let checkNotice = await Notice.model.findOne({notice_user_id: writer_id});
	if (checkNotice.notice_tag != null && checkNotice.notice_tag) {
		//게시글을 작성한 사용자와 댓글을 남기는 사람이 같을 경우 알림 메세지를 담지 않는다.
		if (writer_id != loginUser) {
			let select_opponent = await User.model.findById(writer_id);
			let select_loginUser = await User.model.findById(loginUser);
			let noticeUser = NoticeUser.makeNewdoc({
				notice_user_receive_id: writer_id,
				notice_user_related_id: loginUser,
				notice_user_contents_kor: select_loginUser.user_nickname + '님이 ' + select_opponent.user_nickname + '님을 태그했습니다.',
				notice_object: feed._id,
				notice_object_type: Feed.model.modelName,
				target_object: feedUserTag._id,
				target_object_type: FeedUserTag.model.modelName,
				notice_user_date: Date.now(),
			});
			let resultNoticeUser = await noticeUser.save();

			let user = await User.model
				.findOneAndUpdate({_id: writer_id}, {$set: {user_alarm: true}}, {new: true, upsert: true, setDefaultsOnInsert: true})
				.lean();
		}
	}

	console.log('유저 태그 생성', feedUserTag);
}

async function deleteUserTag(user, feed, loginUser) {
	let feedUserTag = await FeedUserTag.model
		.findOneAndUpdate({usertag_feed_id: feed._id, usertag_user_id: user._id}, {$set: {usertag_is_delete: true}}, {new: true})
		.exec();
	writer_id = user._id;
	await feedUserTag.save();

	//알림 내역에 태그 관련 insert
	let checkNotice = await Notice.model.findOne({notice_user_id: writer_id});
	if (checkNotice.notice_tag != null && checkNotice.notice_tag) {
		//게시글을 작성한 사용자와 댓글을 남기는 사람이 같을 경우 알림 메세지를 담지 않는다.
		if (writer_id != loginUser) {
			let select_opponent = await User.model.findById(writer_id);
			let select_loginUser = await User.model.findById(loginUser);
			let noticeUser = NoticeUser.makeNewdoc({
				notice_user_receive_id: writer_id,
				notice_user_related_id: loginUser,
				notice_user_contents_kor: select_loginUser.user_nickname + '님이 ' + select_opponent.user_nickname + '님을 태그 삭제했습니다.',
				notice_object: feed._id,
				notice_object_type: Feed.model.modelName,
				target_object: feedUserTag._id,
				target_object_type: FeedUserTag.model.modelName,
				notice_user_date: Date.now(),
			});
			let resultNoticeUser = await noticeUser.save();
			let user = await User.model
				.findOneAndUpdate({_id: writer_id}, {$set: {user_alarm: true}}, {new: true, upsert: true, setDefaultsOnInsert: true})
				.lean();
		}
	}
	console.log('유저 태그 삭제', feedUserTag);
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
			let feedMedia = Array();
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

		// await User.model.findOneAndUpdate({_id: req.session.loginUser}, {$inc: {user_upload_count: 1}});

		//업로드 게시물 개수 업데이트
		let feedCount = await Feed.model
			.find({
				$or: [
					{$and: [{feed_type: 'feed'}, {feed_avatar_id: req.session.loginUser}]},
					{$and: [{feed_type: {$in: ['report', 'missing']}}, {feed_avatar_id: undefined}]},
				],
			})
			.where('feed_writer_id', req.session.loginUser)
			.where('feed_is_delete')
			.ne(true)
			.count();

		let communityCount = await Community.model.find({community_writer_id: req.session.loginUser}).where('community_is_delete').ne(true).count();
		let totalCount = feedCount + communityCount;

		let countUpdate = await User.model
			.findOneAndUpdate(
				{
					_id: req.session.loginUser,
				},
				{
					$set: {
						user_upload_count: totalCount,
					},
					$currentDate: {feed_update_date: true},
				},
				{new: true, upsert: true},
			)
			.lean();

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
			let feedMedia = Array();
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

		// await User.model.findOneAndUpdate({_id: req.session.loginUser}, {$inc: {user_upload_count: 1}});

		//업로드 게시물 개수 업데이트
		let feedCount = await Feed.model
			.find({
				$or: [
					{$and: [{feed_type: 'feed'}, {feed_avatar_id: req.session.loginUser}]},
					{$and: [{feed_type: {$in: ['report', 'missing']}}, {feed_avatar_id: undefined}]},
				],
			})
			.where('feed_writer_id', req.session.loginUser)
			.where('feed_is_delete')
			.ne(true)
			.count();

		let communityCount = await Community.model.find({community_writer_id: req.session.loginUser}).where('community_is_delete').ne(true).count();
		let totalCount = feedCount + communityCount;

		let countUpdate = await User.model
			.findOneAndUpdate(
				{
					_id: req.session.loginUser,
				},
				{
					$set: {
						user_upload_count: totalCount,
					},
					$currentDate: {feed_update_date: true},
				},
				{new: true, upsert: true},
			)
			.lean();

		res.json({status: 200, msg: newReport});
	});
});

//특정 유저가 작성한 피드 리스트를 불러온다.
router.post('/getFeedListByUserId', (req, res) => {
	controller(req, res, async () => {
		const limit = parseInt(req.body.limit) * 1 || 30;
		let userFeeds;
		let user = await User.model.findById(req.body.userobject_id);
		if (!user) {
			//res.status(400);
			res.json({status: 400, msg: ALERT_NOT_VALID_USEROBJECT_ID});
			return;
		}

		let likedFeedList = [];
		if (req.body.login_userobject_id) {
			likedFeedList = await LikeFeed.model.find({like_feed_user_id: req.body.login_userobject_id, like_feed_is_delete: false}).lean();
		}

		if (user.user_type == 'pet') {
			//타겟이 반려동물 계정이고 로그인 한 아이디가 주인 계정일 경우 모두 표출 [전체공개, 팔로우, 비공개]

			//타겟이 반려동물 계정이고 로그인 한 아이디가 타인 일 경우 [전체공개, 팔로우(팔로우 여부 확인)]

			//타겟이 반려동물 계정이고 로그인 하지 않았을 경우 [전체공개] 만 해당

			let petFeeds = await Feed.model
				.find({feed_avatar_id: req.body.userobject_id})
				.where('feed_is_delete')
				.ne(true)
				.populate('feed_avatar_id')
				.sort('-_id')
				.limit(limit)
				.lean();
			if (petFeeds.length < 1) {
				//res.status(404);
				res.json({status: 404, user_type: 'pet', msg: ALERT_NO_RESULT});
				return;
			}

			let total_count = await Feed.model.find({feed_avatar_id: req.body.userobject_id}).where('feed_is_delete').ne(true).count().lean();

			//로그인 상태에서만 is_favorite 표출
			if (req.session.loginUser) {
				let favoritedFeedList = [];
				//내가 즐겨찾기를 누른 데이터 불러오기
				favoritedFeedList = await FavoriteFeed.model.find({favorite_feed_user_id: req.session.loginUser, favorite_feed_is_delete: false}).lean();

				petFeeds = petFeeds.map(petFeeds => {
					if (favoritedFeedList.find(favoritedFeed => favoritedFeed.favorite_feed_id == petFeeds._id)) {
						return {...petFeeds, is_favorite: true};
					} else {
						return {...petFeeds, is_favorite: false};
					}
				});
			}

			//res.status(200);
			res.json({
				status: 200,
				user_type: 'pet',
				total_count: total_count,
				msg: petFeeds.map(feed => {
					if (likedFeedList.find(likedFeed => likedFeed.like_feed_id == feed._id)) {
						return {...feed, feed_is_like: true};
					} else {
						return {...feed, feed_is_like: false};
					}
				}),
			});
			return;
		} else {
			//타겟이 주인 계정이고 로그인 한 아이디가 나 자신일 경우 모두 표출 [전체공개, 팔로우, 비공개]

			//타겟이 주인 계정이고 로그인 한 아이디가 타인 일 경우 [전체공개, 팔로우(팔로우 여부 확인)]

			//타겟이 주인 계정이고 로그인 하지 않았을 경우 [전체공개] 만 해당

			if (req.body.order_value != undefined) {
				switch (req.body.order_value) {
					//앞의 데이터 가져오기
					case 'pre':
						userFeeds = await Feed.model
							.find({
								_id: {$gt: mongoose.Types.ObjectId(req.body.target_object_id)},
								$or: [
									{$and: [{feed_type: 'feed'}, {feed_avatar_id: req.body.userobject_id}]},
									{$and: [{feed_type: {$in: ['report', 'missing']}}, {feed_avatar_id: undefined}]},
								],
							})
							.where('feed_writer_id', req.body.userobject_id)
							.where('feed_is_delete')
							.ne(true)
							.populate('feed_writer_id')
							.populate('feed_avatar_id')
							.sort('_id')
							.limit(limit)
							.lean();
						userFeeds = userFeeds.reverse();
						break;

					//바로 게시물을 찾을 경우
					case 'interrupt':
						userFeeds1 = await Feed.model
							.find({
								_id: {$gt: mongoose.Types.ObjectId(req.body.target_object_id)},
								$or: [
									{$and: [{feed_type: 'feed'}, {feed_avatar_id: req.body.userobject_id}]},
									{$and: [{feed_type: {$in: ['report', 'missing']}}, {feed_avatar_id: undefined}]},
								],
							})
							.where('feed_writer_id', req.body.userobject_id)
							.where('feed_is_delete')
							.ne(true)
							.populate('feed_writer_id')
							.populate('feed_avatar_id')
							.sort('_id')
							.limit(limit)
							.lean();

						userFeeds2 = await Feed.model
							.find({
								_id: {$lte: mongoose.Types.ObjectId(req.body.target_object_id)},
								$or: [
									{$and: [{feed_type: 'feed'}, {feed_avatar_id: req.body.userobject_id}]},
									{$and: [{feed_type: {$in: ['report', 'missing']}}, {feed_avatar_id: undefined}]},
								],
							})
							.where('feed_writer_id', req.body.userobject_id)
							.where('feed_is_delete')
							.ne(true)
							.populate('feed_writer_id')
							.populate('feed_avatar_id')
							.sort('-_id')
							.limit(limit + 1)
							.lean();
						userFeeds = userFeeds1.reverse().concat(userFeeds2);
						break;
					//뒤의 데이터 가져오기
					case 'next':
						userFeeds = await Feed.model
							.find({
								_id: {$lt: mongoose.Types.ObjectId(req.body.target_object_id)},
								$or: [
									{$and: [{feed_type: 'feed'}, {feed_avatar_id: req.body.userobject_id}]},
									{$and: [{feed_type: {$in: ['report', 'missing']}}, {feed_avatar_id: undefined}]},
								],
							})
							.where('feed_writer_id', req.body.userobject_id)
							.where('feed_is_delete')
							.ne(true)
							.populate('feed_writer_id')
							.populate('feed_avatar_id')
							.sort('-_id')
							.limit(limit)
							.lean();
						break;
				}
			} else {
				let query = {};
				let feed_public_type_array = [];
				//로그인을 안하면 전체공개 혹은 설정값이 없는 데이터만 확인 가능.
				if (!req.session.loginUser) {
					feed_public_type_array = ['public', undefined];
				}
				//로그인하고 작성자와 그 정보가 같으면 모든 정보 확인
				else if (req.session.loginUser && req.body.userobject_id == req.session.loginUser) {
					feed_public_type_array = ['public', 'private', 'follow', undefined];
				}
				//로그인하고 작성자 정보와 다르면 전체 공개와 설정값이 없는 데이터만 확인 가능.
				else if (req.session.loginUser && req.body.userobject_id != req.session.loginUser) {
					feed_public_type_array = ['public', undefined];
					//로그인하고 작성자 정보와 다르고 팔로우일 경우 팔로우 공개정보까지 확인 가능.

					let follow = false;
					follow = await Follow.model
						.findOne({follow_id: req.body.userobject_id, follower_id: req.session.loginUser, follow_is_delete: false})
						.lean();

					follow = follow != null && !follow.follow_is_delete;
					if (follow) {
						feed_public_type_array.push('follow');
					}
				}
				query['feed_public_type'] = {$in: feed_public_type_array};
				query['$or'] = [
					{$and: [{feed_type: 'feed'}, {feed_avatar_id: req.body.userobject_id}]},
					{$and: [{feed_type: {$in: ['report', 'missing']}}, {feed_writer_id: req.body.userobject_id}]},
				];
				userFeeds = await Feed.model
					.find(query)
					.where('feed_writer_id', req.body.userobject_id)
					.where('feed_is_delete')
					.ne(true)
					.populate('feed_writer_id')
					.populate('feed_avatar_id')
					.sort('-_id')
					.limit(limit)
					.lean();

				if (userFeeds < 1) {
					//res.status(404);
					res.json({status: 404, user_type: user.user_type, msg: ALERT_NO_RESULT});
					return;
				}
			}

			let total_count = await Feed.model
				.find({
					$or: [
						{$and: [{feed_type: 'feed'}, {feed_avatar_id: req.body.userobject_id}]},
						{$and: [{feed_type: {$in: ['report', 'missing']}}, {feed_writer_id: req.body.userobject_id}]},
					],
				})
				.where('feed_writer_id', req.body.userobject_id)
				.where('feed_is_delete')
				.ne(true)
				.count()
				.lean();

			//로그인 상태에서만 is_favorite 표출
			if (req.session.loginUser) {
				let favoritedFeedList = [];
				//내가 즐겨찾기를 누른 데이터 불러오기
				favoritedFeedList = await FavoriteFeed.model.find({favorite_feed_user_id: req.session.loginUser, favorite_feed_is_delete: false}).lean();

				userFeeds = userFeeds.map(userFeeds => {
					if (favoritedFeedList.find(favoritedFeed => favoritedFeed.favorite_feed_id == userFeeds._id)) {
						return {...userFeeds, is_favorite: true};
					} else {
						return {...userFeeds, is_favorite: false};
					}
				});
			}

			//res.status(200);
			res.json({
				status: 200,
				user_type: user.user_type,
				total_count: total_count,
				msg: userFeeds?.map(feed => {
					if (likedFeedList.find(likedFeed => likedFeed.like_feed_id == feed._id)) {
						return {...feed, feed_is_like: true};
					} else {
						return {...feed, feed_is_like: false};
					}
				}),
			});
			return;
		}
	});
});

//특정 유저가 태그된 피드 목록을 불러온다.
router.post('/getUserTaggedFeedList', (req, res) => {
	controller(req, res, async () => {
		const limit = parseInt(req.body.limit) * 1 || 30;
		let taggedFeeds;
		let user = await User.model.findById(req.body.userobject_id);
		if (!user) {
			//res.status(400);
			res.json({status: 400, msg: ALERT_NOT_VALID_USEROBJECT_ID});
			return;
		}

		if (req.body.order_value != undefined) {
			switch (req.body.order_value) {
				//앞의 데이터 가져오기
				case 'pre':
					taggedFeeds = await FeedUserTag.model
						.find({usertag_user_id: user._id, _id: {$gt: mongoose.Types.ObjectId(req.body.target_object_id)}})
						.where('usertag_is_delete')
						.ne(true)
						.where('usertag_is_display_on_taged_user')
						.ne(false)
						.populate({path: 'usertag_feed_id', populate: 'feed_writer_id'})
						.sort('_id')
						.limit(limit)
						.lean();
					taggedFeeds = taggedFeeds.reverse();
					break;

				//바로 게시물을 찾을 경우
				case 'interrupt':
					taggedFeeds1 = await FeedUserTag.model
						.find({usertag_user_id: user._id, _id: {$gt: mongoose.Types.ObjectId(req.body.target_object_id)}})
						.where('usertag_is_delete')
						.ne(true)
						.where('usertag_is_display_on_taged_user')
						.ne(false)
						.populate({path: 'usertag_feed_id', populate: 'feed_writer_id'})
						.sort('_id')
						.limit(limit)
						.lean();

					taggedFeeds2 = await FeedUserTag.model
						.find({usertag_user_id: user._id, _id: {$lte: mongoose.Types.ObjectId(req.body.target_object_id)}})
						.where('usertag_is_delete')
						.ne(true)
						.where('usertag_is_display_on_taged_user')
						.ne(false)
						.populate({path: 'usertag_feed_id', populate: 'feed_writer_id'})
						.sort('-_id')
						.limit(limit + 1)
						.lean();
					taggedFeeds = taggedFeeds1.reverse().concat(taggedFeeds2);
					break;
				//뒤의 데이터 가져오기
				case 'next':
					taggedFeeds = await FeedUserTag.model
						.find({usertag_user_id: user._id, _id: {$lt: mongoose.Types.ObjectId(req.body.target_object_id)}})
						.where('usertag_is_delete')
						.ne(true)
						.where('usertag_is_display_on_taged_user')
						.ne(false)
						.populate({path: 'usertag_feed_id', populate: 'feed_writer_id'})
						.sort('-_id')
						.limit(limit)
						.lean();
					break;
			}
		} else {
			taggedFeeds = await FeedUserTag.model
				.find({usertag_user_id: user._id})
				.where('usertag_is_delete')
				.ne(true)
				.where('usertag_is_display_on_taged_user')
				.ne(false)
				.populate({path: 'usertag_feed_id', populate: 'feed_writer_id feed_avatar_id'})
				.sort('-_id')
				.limit(limit)
				.lean();
		}

		if (!taggedFeeds) {
			console.log('no result');
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		let taggedFeedsArray = Array();
		for (let j = 0; j < taggedFeeds.length; j++) {
			if (taggedFeeds[j].usertag_feed_id != null) {
				taggedFeedsArray.push(taggedFeeds[j]);
			}
		}
		taggedFeeds = JSON.parse(JSON.stringify(taggedFeedsArray));

		//로그인 상태에서만 is_favorite 표출
		if (req.session.loginUser) {
			//내가 즐겨찾기를 누른 데이터 불러오기
			favoritedFeedList = await FavoriteFeed.model.find({favorite_feed_user_id: req.session.loginUser, favorite_feed_is_delete: false}).lean();
			taggedFeeds = taggedFeeds.map(taggedFeeds => {
				//null값 제외.
				if (taggedFeeds.usertag_feed_id == null) {
					return {...taggedFeeds};
				}
				//taggedFeeds._id가 아니라 taggedFeeds.usertag_feed_id._id 임. depth 잘 확인할 것.
				else if (favoritedFeedList.find(favoritedFeed => favoritedFeed.favorite_feed_id == taggedFeeds.usertag_feed_id._id)) {
					return {...taggedFeeds, is_favorite: true};
				} else {
					return {...taggedFeeds, is_favorite: false};
				}
			});

			//좋아요 출력
			let likedFeedList = [];
			likedFeedList = await LikeFeed.model.find({like_feed_user_id: req.session.loginUser, like_feed_is_delete: false}).lean();
			if (likedFeedList != null && likedFeedList.length > 0) {
				taggedFeeds = taggedFeeds.map(taggedFeeds => {
					if (likedFeedList.find(likedFeed => likedFeed.like_feed_id == taggedFeeds.usertag_feed_id._id)) {
						return {...taggedFeeds, feed_is_like: true};
					} else {
						return {...taggedFeeds, feed_is_like: false};
					}
				});
			}
		}
		total_count = await FeedUserTag.model
			.find({usertag_user_id: user._id})
			.where('usertag_is_delete')
			.ne(true)
			.where('usertag_is_display_on_taged_user')
			.ne(false)
			.count()
			.lean();

		res.json({status: 200, total_count: total_count, msg: taggedFeeds});
		// res.json({status: 200, total_count: total_count, msg: taggedFeeds.map(v=>v.usertag_feed_id)});
		return;
	});
});

//실종/제보 요청을 가져온다.
router.post('/getMissingReportList', (req, res) => {
	controller(req, res, async () => {
		const page = parseInt(req.body.page) * 1 || 1;
		const limit = parseInt(req.body.limit) * 1 || 30;
		const skip = (page - 1) * limit;
		let reportMissingList;

		//main에서 나오는 실종/제보는 빠른 출력을 위해 쿼리 쿼리 개선
		if (req.body.main_type == true) {
			console.time();
			reportMissingList = Feed.model
				.find(
					{feed_type: {$ne: 'feed'}},
					{
						_id: 1,
						report_witness_date: 1,
						report_witness_location: 1,
						feed_thumbnail: 1,
						feed_type: 1,
						feed_type: 1,
						feed_content: 1,
						missing_animal_lost_location: 1,
					},
				)
				.where('feed_is_delete')
				.ne(true)
				.skip(skip)
				.limit(limit);
			console.timeEnd();
		} else {
			console.time();
			reportMissingList = Feed.model
				.find({feed_type: {$ne: 'feed'}})
				.where('feed_is_delete')
				.ne(true)
				.skip(skip)
				.limit(limit)
				.populate('feed_writer_id');
			console.timeEnd();
		}

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

		if (reportMissingList.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}
		reportMissingList = await reportMissingList.sort('-_id').lean();

		let favoritedFeedList = [];

		//로그인 상태에서만 is_favorite 표출
		if (req.session.loginUser) {
			//내가 즐겨찾기를 누른 데이터 불러오기
			favoritedFeedList = await FavoriteFeed.model.find({favorite_feed_user_id: req.session.loginUser, favorite_feed_is_delete: false}).lean();

			reportMissingList = reportMissingList.map(reportMissingList => {
				if (favoritedFeedList.find(favoritedFeed => favoritedFeed.favorite_feed_id == reportMissingList._id)) {
					return {...reportMissingList, is_favorite: true};
				} else {
					return {...reportMissingList, is_favorite: false};
				}
			});
		}

		reportMissingList = reportMissingList.map(reportMissingList => {
			if (reportMissingList.feed_type == 'report' && !reportMissingList.feed_content.indexOf('&#&##')) {
				return {
					...reportMissingList,
					feed_content: reportMissingList.feed_content.replace('&#&##', '#').replace('%&%61d2e0c3ce5bd4c9dba45ae0&#&#', ''),
				};
			} else {
				return {...reportMissingList, feed_content: reportMissingList.feed_content};
			}
		});

		res.json({status: 200, msg: reportMissingList});
	});
});

//피드,실종,제보 게시글 상세정보 가져오기
router.post('/getFeedDetailById', (req, res) => {
	controller(req, res, async () => {
		let feed = await Feed.model.findById(req.body.feedobject_id).where('feed_is_delete').ne(true).populate('feed_writer_id').lean();
		if (!feed) {
			//res.status(404);
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		let favoritedList = [];
		let favoritedFeedList = [];
		if (req.session.loginUser) {
			favoritedList = await FavoriteEtc.model.find({favorite_etc_user_id: req.session.loginUser, favorite_etc_is_delete: false}).lean();
			if (favoritedList.find(favoritedList => favoritedList.favorite_etc_target_object_id == feed.feed_writer_id._id)) {
				feed.is_favorite = true;
			} else {
				feed.is_favorite = false;
			}

			favoritedFeedList = await FavoriteFeed.model.find({favorite_feed_user_id: req.session.loginUser, favorite_feed_is_delete: false}).lean();
			if (favoritedFeedList.find(favoritedFeedList => favoritedFeedList.favorite_feed_id == feed._id)) {
				feed.feed_is_favorite = true;
			} else {
				feed.feed_is_favorite = false;
			}
		}
		res.json({status: 200, msg: feed});
	});
});

//추천 피드 리스트를 불러옴(홈화면)
router.post('/getSuggestFeedList', (req, res) => {
	controller(req, res, async () => {
		const limit = parseInt(req.body.limit) * 1 || 30;
		let feed;
		console.log('req.body.order_value=>', req.body.order_value);
		console.log('req.body.target_object_id=>', req.body.target_object_id);
		query = {};

		if (!req.session.loginUser) {
			query['feed_public_type'] = {$in: ['public', undefined]};
		}

		if (req.body.order_value != undefined) {
			switch (req.body.order_value) {
				//앞의 데이터 가져오기
				case 'pre':
					// query['_id'] = {$gt: mongoose.Types.ObjectId(req.body.target_object_id)};
					// feed = await Feed.model
					// 	.find(query)
					// 	.where('feed_is_delete')
					// 	.ne(true)
					// 	.populate('feed_writer_id')
					// 	.populate('feed_avatar_id')
					// 	.sort('_id')
					// 	.limit(limit)
					// 	.lean();
					// feed = feed.reverse();
					console.log('--pre--');
					feed = await Feed.model
						.find(query)
						.where('feed_is_delete')
						.ne(true)
						.populate('feed_writer_id')
						.populate('feed_avatar_id')
						.sort('-_id')
						.limit(limit)
						.lean();
					break;

				//바로 게시물을 찾을 경우
				case 'interrupt':
					query['_id'] = {$gt: mongoose.Types.ObjectId(req.body.target_object_id)};
					feedList1 = await Feed.model
						.find(query)
						.where('feed_is_delete')
						.ne(true)
						.populate('feed_writer_id')
						.populate('feed_avatar_id')
						.sort('_id')
						.limit(limit)
						.lean();
					console.log('feedList1=>', feedList1.reverse());

					query['_id'] = undefined;
					query['_id'] = {$lte: mongoose.Types.ObjectId(req.body.target_object_id)};

					feedList2 = await Feed.model
						.find(query)
						.where('feed_is_delete')
						.ne(true)
						.populate('feed_writer_id')
						.populate('feed_avatar_id')
						.sort('-_id')
						.limit(limit + 1)
						.lean();
					console.log('feedList2=>', feedList2);
					feed = feedList1.reverse().concat(feedList2);
					break;
				//뒤의 데이터 가져오기
				case 'next':
					query['_id'] = {$lt: mongoose.Types.ObjectId(req.body.target_object_id)};
					feed = await Feed.model
						.find({_id: {$lt: mongoose.Types.ObjectId(req.body.target_object_id)}})
						.where('feed_is_delete')
						.ne(true)
						.populate('feed_writer_id')
						.populate('feed_avatar_id')
						.sort('-_id')
						.limit(limit)
						.lean();
					break;
			}
		} else {
			feed = await Feed.model
				.find(query)
				.where('feed_is_delete')
				.ne(true)
				.populate('feed_writer_id')
				.populate('feed_avatar_id')
				.sort('-_id')
				.limit(limit)
				.lean();
		}
		// console.log('query=>', query);
		if (!feed) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		let feedCount = await Feed.model.find().where('feed_is_delete').ne(true).count().lean();

		let likedFeedList = [];
		if (req.body.login_userobject_id != undefined) {
			likedFeedList = await LikeFeed.model.find({like_feed_user_id: req.body.login_userobject_id, like_feed_is_delete: false}).lean();
		}

		if (likedFeedList != null && likedFeedList.length > 0) {
			feed = feed.map(feed => {
				if (likedFeedList.find(likedFeed => likedFeed.like_feed_id == feed._id)) {
					return {...feed, feed_is_like: true};
				} else {
					return {...feed, feed_is_like: false};
				}
			});
		}
		// console.log('feed=>', feed);
		if (req.session.loginUser) {
			let tempFeed = Array();
			//로그인 한 ID로 팔로워 리스트 가져옴. (로그인 사용자 기준으로 누군가 나를 팔로우 한 리스트임.)
			let followerList = await Follow.model.find({follower_id: req.session.loginUser, follow_is_delete: false}).lean();
			feed.map(item => {
				//feed_public_type이 정의되어 있지 않거나 public일 경우 모두 공개
				if (item.feed_public_type == null || item.feed_public_type == undefined || item.feed_public_type == 'public') {
					// console.log('public--');
					// return {...feed};
					tempFeed.push(item);
				}
				//ID가 삭제 되었을때 일단 모두 공개
				else if (item.feed_writer_id._id == null || item.feed_writer_id._id == undefined) {
					// console.log('ID  삭제 --');
					tempFeed.push(item);
				}
				//ID가 follow만 공개일때(당연히 작성자는 보여야 한다)
				else if (item.feed_public_type == 'follow') {
					// console.log('follow --');
					if (
						followerList.find(follow => follow.follow_id.equals(item.feed_writer_id._id)) ||
						followerList.find(follow => mongoose.Types.ObjectId(req.session.loginUser).equals(item.feed_writer_id._id))
					) {
						tempFeed.push(item);
					}
				} else if (item.feed_public_type == 'private') {
					// console.log('비공개 --');
					if (item.feed_writer_id._id == req.session.loginUser) {
						tempFeed.push(item);
					}
				}
			});

			feed = Array();
			feed = JSON.parse(JSON.stringify(tempFeed)); //배열깊은복사
		}

		//로그인 상태에서만 is_favorite 표출 & 비밀 댓글일 경우 안보이게 하기
		if (req.session.loginUser) {
			let favoritedFeedList = [];
			//내가 즐겨찾기를 누른 데이터 불러오기
			favoritedFeedList = await FavoriteFeed.model.find({favorite_feed_user_id: req.session.loginUser, favorite_feed_is_delete: false}).lean();

			feed = feed.map(feed => {
				if (favoritedFeedList.find(favoritedFeed => favoritedFeed.favorite_feed_id == feed._id)) {
					return {...feed, is_favorite: true};
				} else {
					return {...feed, is_favorite: false};
				}
			});
		}

		feed = feed.map(feed => {
			if (feed.feed_type != null && feed.feed_type != undefined && feed.feed_type == 'report' && !feed.feed_content.indexOf('&#&##')) {
				return {
					...feed,
					feed_content: feed.feed_content.replace('&#&##', '#').replace('%&%61d2e0c3ce5bd4c9dba45ae0&#&#', ''),
				};
			} else {
				return {...feed, feed_content: feed.feed_content};
			}
		});
		res.json({status: 200, total_count: feedCount, msg: feed, liked: likedFeedList});
	});
});

//피드 수정
router.post('/editFeed', uploadS3.array('media_uri'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let targetFeed = await Feed.model.findById(req.body.feedobject_id);
		if (!targetFeed) {
			res.json({status: 404, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		} //대상 피드 오브젝트가 유효한 오브젝트인지 확인
		targetFeed.feed_content = req.body.feed_content;
		// targetFeed.feed_location = req.body.feed_location;
		targetFeed.feed_type = 'feed';
		targetFeed.feed_is_protect_diary = req.body.feed_is_protect_diary;
		targetFeed.feed_update_date = Date.now();
		targetFeed.feed_public_type = req.body.feed_public_type;
		targetFeed.feed_location = typeof req.body.feed_location == 'string' ? JSON.parse(req.body.feed_location) : req.body.feed_location;

		let feedMedias = typeof req.body.feed_medias == 'string' ? JSON.parse(req.body.feed_medias) : req.body.feed_medias;
		let receivedTags = feedMedias.map(media => media.tags).flat();
		let tagsInDB = targetFeed.feed_medias.map(media => media.tags).flat();
		receivedTags.forEach(tags => {
			console.log('생성결과', !tagsInDB.find(tagsInDB => tagsInDB.user._id == tags.user._id));
			if (!tagsInDB.find(tagsInDB => tagsInDB.user._id == tags.user._id)) {
				createUserTag(tags.user, targetFeed, req.session.loginUser);
			}
		});
		tagsInDB.forEach(tagsInDB => {
			console.log('삭제결과', !receivedTags.find(tag => tag.user._id == tagsInDB.user._id));
			if (!receivedTags.find(tag => tag.user._id == tagsInDB.user._id)) {
				deleteUserTag(tagsInDB.user, targetFeed, req.session.loginUser);
			}
		});
		/*FeedMedias에 담긴 피드 태그의 정보를 바탕으로 피드의 태그 정보를 업데이트
		 * 업데이트 요청의 tag와 db상의 tag리스트를 가공하여
		 * 업데이트 요청에는 존재하나 db상의 tag리스트에 없을때 - tag를 db에 새로 생성
		 * 업데이트 요청에는 없으나 db상의 tag리스트에 있을때 - tag를 db에서 삭제
		 * 요청과 db에 모두 존재할때 - db에서 tag정보를 변경하지 않음 //TODO : 좌표가 바뀌었을때 업데이트 하도록 변경해야함
		 */

		if (req.files && req.files.length > 0) {
			targetFeed.feed_medias = feedMedias.map(media => {
				let uri = req.files.find(file => media.media_uri.includes(file.originalname));
				//요청으로 받은 feed_medias필드의 오브젝트의 uri와 s3에 업데이트된 파일의 실제 이름을 비교하여
				//req.files(s3에 업데이트를 완료한 뒤 multer s3라이브러리가 반환한 객체들의 array)에서 해당 파일에 대한 정보를 얻음
				if (uri) {
					return {...media, tags: [...media.tags], media_uri: uri.location};
					//req.files에 feed_medias 필드에 있는 파일이 존재할때 media_uri를 업데이트
				} else {
					return {
						...media,
						tags: [...media.tags],
					};
					//req.files에 feed_medias 필드에 있는 파일이 없을때 media_uri를 업데이트하지 않음
				}
			});
		} else {
			targetFeed.feed_medias = feedMedias;
			//req.files가 없을때(피드 수정시 이미지를 삭제하거나 새로 업데이트 하지 않을 경우) 요청된 feed_medias를 그대로 디비에 업데이트
		}

		let hashTags =
			typeof req.body.hashtag_keyword == 'string' ? req.body.hashtag_keyword.replace(/[\[\]\"]/g, '').split(',') : req.body.hashtag_keyword;
		let previousHashes = await HashFeed.model.find({hashtag_feed_id: targetFeed._id}).populate('hashtag_id').exec();

		// let hashMemberLenth = targetFeed.feed_hashtag_member.length;
		// let hasgTagsExists = Array();
		let keyword_exists = false;
		let deleted_id;
		let checkedList = Array();

		// feed_hashtag_member 배열 필드에 추가하기 위한 변수
		let add_feed_hashtag_member = Array();
		//피드에 현재 쓰여진 hashTags 단어가 수정 전의 해시태그 목록에 없을 경우 추가
		for (let i = 0; i < hashTags.length; i++) {
			for (let j = 0; j < previousHashes.length; j++) {
				if (
					hashTags[i] == previousHashes[j].hashtag_id.hashtag_keyword &&
					mongoose.Types.ObjectId(targetFeed.feed_hashtag_member[j]).equals(previousHashes[j]._id)
				) {
					console.log('해시태그가 일치하기 때문에 업로드 하지 않음.=>', previousHashes[j].hashtag_id.hashtag_keyword);
					// hasgTagsExists.push(true);
					keyword_exists = true;
					break;
				} else {
					keyword_exists = false;
				}
			}
			if (!keyword_exists) {
				//과거 데이터 확인 결과 존재하지 않는다면 추가한다.
				// createHash(hashTags[i], targetFeed._id);

				createHash(hashTags[i], targetFeed._id).then(function (data) {
					//해시태그 추가시 feed_hashtag_member 배열 필드에 추가
					Feed.model.findOneAndUpdate({_id: targetFeed._id}, {$push: {feed_hashtag_member: data._id}}).exec();
				});
			}
		}

		//수정전의 해시태그 목록(DB)에 있는데 피드에 현재 쓰여진 hashTags 단어에 없을 경우 기존 DB에서 삭제 (피드글을 수정하면서 해시태그 단어를 삭제하는 경우임)
		for (let i = 0; i < previousHashes.length; i++) {
			for (let j = 0; j < hashTags.length; j++) {
				if (checkedList.includes(previousHashes[i])) {
					continue;
				} else if (
					hashTags[j] == previousHashes[i].hashtag_id.hashtag_keyword &&
					mongoose.Types.ObjectId(targetFeed.feed_hashtag_member[j]).equals(previousHashes[i]._id)
				) {
					console.log('해시태그가 일치하기 때문에 삭제 하지 않음.=>', hashTags[i]);
					// hasgTagsExists.push(true);
					keyword_exists = true;
					checkedList.push(previousHashes[i]._id);
					deleted_id = '';
					break;
				} else {
					keyword_exists = false;
					deleted_id = previousHashes[i]._id;
				}
			}
			if (!keyword_exists) {
				//과거 해시데이터 단어가 현재 피드에 존재하지 않는다면 삭제한다.
				deleteHash(hashTags[i], targetFeed._id, deleted_id);
				Feed.model.findOneAndUpdate({_id: targetFeed._id}, {$pull: {feed_hashtag_member: deleted_id}}).exec();
			}
		}

		// hashTags.forEach(hash => {
		// 	if (!previousHashes.find(prev => prev.hashtag_id.hashtag_keyword == hash)) {
		// 		createHash(hash, targetFeed._id);
		// 	}
		// });

		// previousHashes.forEach(prev => {
		// 	if (!hashTags.find(hash => prev.hashtag_id.hashtag_keyword == hash)) {
		// 		deleteHash(prev.hashtag_id.hashtag_keyword, targetFeed._id);
		// 	}
		// });
		/*FeedContent에 담긴 해시 태그의 정보를 바탕으로 피드의 해시태그 정보를 업데이트
		 * 업데이트 요청의 hashtag와 db상의 hashtag리스트를 가공하여
		 * 업데이트 요청에는 존재하나 db상의 hashtag리스트에 없을때 - hashtag를 db에 새로 생성
		 * 업데이트 요청에는 없으나 db상의 hashtag리스트에 있을때 - hashtag를 db에서 삭제
		 * 요청과 db에 모두 존재할때 - db에서 hashtag정보를 변경하지 않음
		 */

		if (req.files && req.files.length > 0) {
			console.log('수정 썸네일', req.files);
			let isVideoThumb = !targetFeed.feed_medias.some(media => media.media_uri == req.files[req.files.length - 1].originalname);
			if (isVideoThumb) {
				targetFeed.feed_thumbnail = req.files[req.files.length - 1].location;
				console.log('썸네일 수정함', targetFeed.feed_thumbnail);
			} else {
				targetFeed.feed_thumbnail = targetFeed.feed_medias[0].media_uri;
				console.log('썸네일 수정 안함', targetFeed.feed_thumbnail);
			}
		}

		//피드 썸네일을 피드의 이미지 리스트중 가장 먼저인 이미지로 설정
		const result = await targetFeed.save();

		res.json({status: 200, msg: result});
	});
});

//피드 좋아요/취소
router.post('/likeFeed', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let targetFeed = await Feed.model.findById(req.body.feedobject_id);
		if (!targetFeed) {
			res.json({status: 404, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}

		//주의 ! (클라이언트에서 넘어오는 값과 스웨거에서 넘어오는 데이터형 확인 필요 !)
		let is_like;
		if (typeof req.body.is_like == 'string') is_like = req.body.is_like == 'true' ? true : false;
		else is_like = req.body.is_like;

		let likeFeed = await LikeFeed.model
			.findOneAndUpdate(
				{like_feed_id: targetFeed._id, like_feed_user_id: req.body.userobject_id},
				{$set: {like_feed_update_date: Date.now(), like_feed_is_delete: !is_like}},
				{new: true, upsert: true},
			)
			.exec();
		console.log('논리', typeof is_like);
		// targetFeed = await Feed.model.findOneAndUpdate({_id: targetFeed._id}, {$inc: {feed_like_count: is_like ? 1 : -1}}, {new: true}).exec();

		//좋아요 컬렉션에서 is delete가 true가 아닌 것만 가져와서 count 확인.
		let count = await LikeFeed.model
			.find({like_feed_id: mongoose.Types.ObjectId(req.body.feedobject_id)})
			.where('like_feed_is_delete')
			.ne(true)
			.count();

		targetFeed['feed_like_count'] = count;
		await targetFeed.save();

		let writer_id = targetFeed.feed_writer_id;

		//알림 내역에 좋아요 관련 insert
		//피드 게시물의 작성자 알림 내역 중 좋아요 알림 'true' 여부 확인
		let checkNotice = await Notice.model.findOne({notice_user_id: writer_id});
		if (checkNotice.notice_my_post != null && checkNotice.notice_my_post) {
			//피드 게시글을 작성한 사용자와 좋아요를 남기는 사람이 같을 경우 알림 메세지를 담지 않는다.
			if (writer_id != req.session.loginUser) {
				let select_opponent = await User.model.findById(writer_id);
				let select_loginUser = await User.model.findById(req.session.loginUser);
				let message;
				if (is_like) message = '님의 게시물을 좋아합니다.';
				else message = "님의 게시물 '좋아요'를 취소했습니다.";
				let noticeUser = NoticeUser.makeNewdoc({
					notice_user_receive_id: writer_id,
					notice_user_related_id: req.session.loginUser,
					notice_user_contents_kor: select_loginUser.user_nickname + '님이 ' + select_opponent.user_nickname + message,
					notice_object: likeFeed._id,
					notice_object_type: LikeFeed.model.modelName,
					target_object: req.body.feedobject_id,
					target_object_type: Feed.model.modelName,
					notice_user_date: Date.now(),
				});
				let resultNoticeUser = await noticeUser.save();
				let user = await User.model
					.findOneAndUpdate({_id: writer_id}, {$set: {user_alarm: true}}, {new: true, upsert: true, setDefaultsOnInsert: true})
					.lean();
			}
		}

		res.json({status: 200, msg: {likeFeed: likeFeed, targetFeed: targetFeed}});
	});
});

//유저가 좋아요를 누른 피드 리스트
router.post('/getLikedFeedList', (req, res) => {
	controllerLoggedIn(req, res, async () => {});
});

//피드 즐겨찾기 설정/취소
router.post('/favoriteFeed', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let targetFeed = await Feed.model.findById(req.body.feedobject_id).where('feed_is_delete').ne(true);
		if (!targetFeed) {
			res.json({status: 404, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}

		let is_favorite = req.body.is_favorite;

		let favoriteFeed = await FavoriteFeed.model
			.findOneAndUpdate(
				{favorite_feed_id: targetFeed._id, favorite_feed_user_id: req.body.userobject_id},
				{$set: {favorite_feed_update_date: Date.now(), favorite_feed_is_delete: !is_favorite}},
				{new: true, upsert: true},
			)
			.exec();
		targetFeed = await Feed.model.findOneAndUpdate({_id: targetFeed._id}, {$inc: {feed_favorite_count: is_favorite ? 1 : -1}}, {new: true}).exec();

		res.json({status: 200, msg: {favoriteFeed: favoriteFeed, targetFeed: targetFeed}});
	});
});

//유저의 피드 즐겨찾기 목록 조회
router.post('/getFavoriteFeedListByUserId', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		const limit = parseInt(req.body.limit) * 1 || 30;

		let user = await User.model.findById(req.body.userobject_id);
		if (!user) {
			res.json({status: 400, msg: ALERT_NOT_VALID_USEROBJECT_ID});
			return;
		}
		let feedlist;

		if (req.body.order_value != undefined) {
			switch (req.body.order_value) {
				//앞의 데이터 가져오기
				case 'pre':
					feedlist = await FavoriteFeed.model
						.find({favorite_feed_user_id: user._id, _id: {$gt: mongoose.Types.ObjectId(req.body.target_object_id)}})
						.where('favorite_feed_is_delete')
						.ne(true)
						.populate({path: 'favorite_feed_id', populate: 'feed_writer_id'})
						.sort('_id')
						.limit(limit)
						.lean();
					feedlist = feedlist.reverse();
					break;

				//바로 게시물을 찾을 경우
				case 'interrupt':
					feedList1 = await FavoriteFeed.model
						.find({favorite_feed_user_id: user._id, _id: {$gt: mongoose.Types.ObjectId(req.body.target_object_id)}})
						.where('favorite_feed_is_delete')
						.ne(true)
						.populate({path: 'favorite_feed_id', populate: 'feed_writer_id'})
						.sort('_id')
						.limit(limit)
						.lean();
					console.log('feedList1=>', feedList1.reverse());

					feedList2 = await FavoriteFeed.model
						.find({favorite_feed_user_id: user._id, _id: {$lte: mongoose.Types.ObjectId(req.body.target_object_id)}})
						.where('favorite_feed_is_delete')
						.ne(true)
						.populate({path: 'favorite_feed_id', populate: 'feed_writer_id'})
						.sort('-_id')
						.limit(limit + 1)
						.lean();
					console.log('feedList2=>', feedList2);
					feedlist = feedList1.reverse().concat(feedList2);
					break;
				//뒤의 데이터 가져오기
				case 'next':
					feedlist = await FavoriteFeed.model
						.find({usertag_user_id: user._id, _id: {$lt: mongoose.Types.ObjectId(req.body.target_object_id)}})
						.where('favorite_feed_is_delete')
						.ne(true)
						.populate({path: 'favorite_feed_id', populate: 'feed_writer_id'})
						.sort('-_id')
						.limit(limit)
						.lean();
					break;
			}
		} else {
			feedlist = await FavoriteFeed.model
				.find({favorite_feed_user_id: user._id})
				.where('favorite_feed_is_delete')
				.ne(true)
				.populate({path: 'favorite_feed_id', populate: 'feed_writer_id'})
				.sort('-_id')
				.limit(limit)
				.lean();
		}

		//로그인 상태에서만 is_favorite 표출
		if (req.session.loginUser) {
			//내가 즐겨찾기를 누른 데이터 불러오기
			favoritedFeedList = await FavoriteFeed.model.find({favorite_feed_user_id: req.session.loginUser, favorite_feed_is_delete: false}).lean();
			feedlist = feedlist.map(feedlist => {
				//null값 제외.
				if (feedlist.favorite_feed_id == null) {
					return {...feedlist};
				}
				//feedlist._id가 아니라 feedlist.favorite_feed_id._id 임. depth 잘 확인할 것.
				else if (favoritedFeedList.find(favoritedFeed => favoritedFeed.favorite_feed_id == feedlist.favorite_feed_id._id)) {
					return {...feedlist, is_favorite: true};
				} else {
					return {...feedlist, is_favorite: false};
				}
			});

			//좋아요 출력
			let likedFeedList = [];
			likedFeedList = await LikeFeed.model.find({like_feed_user_id: req.session.loginUser, like_feed_is_delete: false}).lean();
			if (likedFeedList != null && likedFeedList.length > 0) {
				feedlist = feedlist.map(feedlist => {
					if (likedFeedList.find(likedFeed => likedFeed.like_feed_id == feedlist.favorite_feed_id._id)) {
						return {...feedlist, feed_is_like: true};
					} else {
						return {...feedlist, feed_is_like: false};
					}
				});
			}
		}
		let total_count = await FavoriteFeed.model
			.find({
				favorite_feed_user_id: user._id,
				favorite_feed_is_delete: false,
			})
			.where('favorite_feed_is_delete')
			.ne(true)
			.count()
			.lean();

		res.json({status: 200, total_count: total_count, msg: feedlist});
	});
});

//실종/제보 수정
router.post('/editMissingReport', uploadS3.array('media_uri'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		const fields = Object.keys(req.body);
		const query = {};
		let targetFeed = {};

		//업데이트 진행되는 필드만 가져옴
		for (let i = 0; i < fields.length; i++) {
			query[fields[i]] = Object.values(req.body)[i];
		}

		//업데이트 날짜에 해당되는 필드는 항상 별도로 추가 입력 필요
		query.feed_update_date = Date.now();

		targetFeed = await Feed.model.findById(req.body.feedobject_id).where('feed_is_delete').ne(true).exec();

		//삭제할 사진이 있을 경우
		if (query.photos_to_delete) {
			if (targetFeed.feed_medias.length > 0) {
				let photos_to_delete = new Array();
				photos_to_delete = req.body.photos_to_delete;

				//삭제할 사진이 있는지 확인 후 삭제 진행
				let temp_list = new Array();
				for (let i = 0; i < targetFeed.feed_medias.length; i++) {
					if (!photos_to_delete.includes(i)) {
						temp_list.push(targetFeed.feed_medias[i]);
					}
				}
				targetFeed.feed_medias = [...temp_list];
				await targetFeed.save();
			}
		}

		feed_medias_temp = Array();
		if (req.files && req.files.length > 0) {
			let feedMedia = Array();
			feed_medias_temp = req.files.map((v, i) => {
				return {
					...feedMedia[i],
					media_uri: v.location,
				};
			});
		}

		//현재 가지고 있는 사진과 새로 추가된 사진 merge
		query.feed_medias = targetFeed.feed_medias.concat(feed_medias_temp);

		//썸네일 규정
		query.feed_thumbnail = query.feed_medias[0].media_uri;

		/*FeedContent에 담긴 해시 태그의 정보를 바탕으로 피드의 해시태그 정보를 업데이트
		 * 업데이트 요청의 hashtag와 db상의 hashtag리스트를 가공하여
		 * 업데이트 요청에는 존재하나 db상의 hashtag리스트에 없을때 - hashtag를 db에 새로 생성
		 * 업데이트 요청에는 없으나 db상의 hashtag리스트에 있을때 - hashtag를 db에서 삭제
		 * 요청과 db에 모두 존재할때 - db에서 hashtag정보를 변경하지 않음
		 */
		if (query.hashtag_keyword) {
			let hashTags = typeof query.hashtag_keyword == 'string' ? query.hashtag_keyword.replace(/[\[\]\"]/g, '').split(',') : req.body.hashtag_keyword;
			let previousHashes = await HashFeed.model.find({hashtag_feed_id: targetFeed._id}).populate('hashtag_id').exec();

			hashTags.forEach(hash => {
				if (!previousHashes.find(prev => prev.hashtag_id.hashtag_keyword == hash)) {
					createHash(hash, targetFeed._id);
				}
			});

			previousHashes.forEach(prev => {
				if (!hashTags.find(hash => prev.hashtag_id.hashtag_keyword == hash)) {
					deleteHash(prev.hashtag_id.hashtag_keyword, targetFeed._id);
				}
			});
		}

		// 데이터가 들어온 필드만 업데이트를 진행
		const result = await Feed.model
			.findByIdAndUpdate(
				{_id: query.feedobject_id},
				{
					$set: query,
				},
				{new: true, upsert: true},
			)
			.lean();
		res.json({status: 200, msg: result});
	});
});

//피드/실종/제보 삭제
router.post('/deleteFeed', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let feedResult = await Feed.model
			.findOneAndUpdate(
				{
					feed_writer_id: req.session.loginUser,
					_id: req.body.feed_object_id,
				},
				{
					$set: {
						feed_is_delete: true,
					},
					$currentDate: {feed_update_date: true},
				},
				{new: true, upsert: true},
			)
			.lean();

		//업로드 게시물 개수 업데이트
		let feedCount = await Feed.model
			.find({
				$or: [
					{$and: [{feed_type: 'feed'}, {feed_avatar_id: req.session.loginUser}]},
					{$and: [{feed_type: {$in: ['report', 'missing']}}, {feed_avatar_id: undefined}]},
				],
			})
			.where('feed_writer_id', req.session.loginUser)
			.where('feed_is_delete')
			.ne(true)
			.count();

		let communityCount = await Community.model.find({community_writer_id: req.session.loginUser}).where('community_is_delete').ne(true).count();
		let totalCount = feedCount + communityCount;

		let countUpdate = await User.model
			.findOneAndUpdate(
				{
					_id: req.session.loginUser,
				},
				{
					$set: {
						user_upload_count: totalCount,
					},
					$currentDate: {feed_update_date: true},
				},
				{new: true, upsert: true},
			)
			.lean();

		let deleteHashFeedList = await HashFeed.model
			.find({
				hashtag_feed_id: req.body.feed_object_id,
			})
			.where('hashtag_is_delete')
			.ne(true);

		//내용에 해시태그가 추가되어 있다면 모두 '삭제'로 변경
		let hashTagsresult = await HashFeed.model
			.updateMany(
				{
					hashtag_feed_id: req.body.feed_object_id,
				},
				{$set: {hashtag_is_delete: true, hashtag_feed_update_date: Date.now()}},
				{new: true},
			)
			.exec();

		for (let k = 0; k < deleteHashFeedList.length; k++) {
			// $inc -1로 진행할 경우 시간이 흐르면 오차 발행. 반드시 count로 업데이트 필요
			let cnt = await Hash.model.findById({_id: deleteHashFeedList[k].hashtag_id}).count().lean();
			let hashValue = await Hash.model
				.findOneAndUpdate({_id: deleteHashFeedList[k].hashtag_id}, {$set: {hashtag_feed_count: cnt - 1}}, {new: true})
				.exec();
		}

		//피드게시물에 게시된 해시태그 리스트 불러오기
		let hasgTagList = await HashFeed.model.find({hashtag_feed_id: req.body.feed_object_id}).lean();

		//삭제대상 게시물에 해시태그가 존재할 경우 해당 해시태그의 카운트를 수정한다.
		if (hasgTagList.length > 0) {
			for (let i = 0; i < hasgTagList.length; i++) {
				//hashtagfeedobjects 컬렉션에서 hashtag_id에 해당되는 개수를 얻어
				let count = await HashFeed.model.find({hashtag_id: hasgTagList[i].hashtag_id}).where('hashtag_is_delete').ne(true).count().lean();
				let countresut = await Hash.model.findOneAndUpdate(
					{_id: hasgTagList[i].hashtag_id},
					{$set: {hashtag_feed_count: count}},
					{new: true, upsert: true, setDefaultsOnInsert: true},
				);
			}
		}

		//피드
		resultNoticeUser = await NoticeUser.model
			.findOneAndUpdate({notice_object: req.body.commentobject_id}, {$set: {notice_is_delete: true}})
			.where({notice_object_type: 'CommentObject'})
			.where({notice_user_related_id: req.session.loginUser});

		res.json({status: 200, msg: feedResult});
	});
});

//태그된 피드 디스플레이 설정/취소
router.post('/updateUserTagDisplay', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let feedUserTag = await FeedUserTag.model
			.findOneAndUpdate({_id: req.body.feed_user_tag_object_id}, {$set: {usertag_is_display_on_taged_user: req.body.is_display}}, {new: true})
			.exec();

		res.json({status: 200, msg: feedUserTag});
	});
});

module.exports = router;
