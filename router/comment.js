const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Feed = require('../schema/feed');
const Comment = require('../schema/comment');
const ProtectRequest = require('../schema/protectRequest');
const uploadS3 = require('../common/uploadS3');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT} = require('./constants');

//댓글 대댓글 작성
router.post('/createComment', uploadS3.single('comment_photo_uri'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let comment = await Comment.makeNewdoc({
			comment_photo_uri: req.file?.location,
			comment_contents: req.body.comment_contents,
			comment_is_secure: req.body.comment_is_secure,
			comment_writer_id: req.session.loginUser,
		});
		let parentComment;
		if (req.body.commentobject_id && req.body.commentobject_id.length > 0) {
			parentComment = await Comment.model.findById(req.body.commentobject_id);
			if (parentComment) comment.comment_parent_writer_id = parentComment.comment_writer_id;
			parentComment.children_count++;
			comment.comment_parent = req.body.commentobject_id;
		} //부모 코멘트의 작성자를 설정(Secure기능을 이용하기 위함)

		if (req.body.feedobject_id && req.body.feedobject_id.length > 0) {
			comment.comment_feed_id = req.body.feedobject_id;
			let targetFeed = await Feed.model.findById(req.body.feedobject_id);
			if (targetFeed) {
				targetFeed.feed_recent_comment.comment_id = comment._id; //게시물에 달린 최신 댓글 설정(1개까지)
				targetFeed.feed_recent_comment.comment_user_nickname = req.session.user_nickname; //코멘트 작성자의 닉네임
				targetFeed.feed_recent_comment.comment_contents = comment.comment_contents; //코멘트 내용
				targetFeed.feed_comment_count++;
				comment.comment_feed_writer_id = targetFeed.feed_writer_id; //댓글이 달린 피드의 작성자를 설정(Secure기능을 이용하기 위함)
			}
			await targetFeed.save();
		} else if (req.body.protect_request_object_id && req.body.protect_request_object_id.length > 0) {
			comment.comment_protect_request_id = req.body.protect_request_object_id;
			let targetProtectRequest = await ProtectRequest.model.findById(req.body.protect_request_object_id);
			if (targetProtectRequest) {
				targetProtectRequest.protect_recent_comment.comment_id = comment._id; //게시물에 달린 최신 댓글 설정(1개까지)
				targetProtectRequest.protect_recent_comment.comment_user_nickname = req.session.user_nickname; //코멘트 작성자의 닉네임
				targetProtectRequest.protect_recent_comment.comment_contents = comment.comment_contents; //코멘트 내용
				targetProtectRequest.protect_request_comment_count++;
				comment.comment_protect_request_writer_id = targetProtectRequest.protect_request_writer_id; //댓글이 달린 동물보호 요청 게시물의 작성자를 설정(Secure기능을 이용하기 위함)
			}
			await targetProtectRequest.save();
		}

		// comment_protect_request_id: req.body.comment_protect_request_id,
		//TODO : 댓글이 달린 보호요청 게시물의 작성자 설정(Secure기능을 이용하기 위함)
		(await parentComment) && parentComment.save();
		let newComment = await comment.save();
		//res.status(200);
		res.json({status: 200, msg: newComment});
	});
});

//피드(피드,실종,제보)댓글 리스트 불러오기
router.post('/getCommentListByFeedId', (req, res) => {
	controller(req, res, async () => {
		let feed = await Feed.model.findById(req.body.feedobject_id).exec();
		if (!feed) {
			res.json({status: 400, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}

		let commentList = await Comment.model
			.find({comment_feed_id: feed._id, comment_parent: {$exists: false}})
			.populate('comment_writer_id')
			.sort('-_id')
			.exec();
		if (commentList.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}
		res.json({status: 200, msg: commentList});
	});
});

//동물보호요청게시글 댓글 리스트 불러오기
router.post('/getCommentListByProtectId', (req, res) => {
	controller(req, res, async () => {
		let protectRequest = await ProtectRequest.model.findById(req.body.protect_request_object_id).exec();

		if (!protectRequest) {
			res.json({status: 400, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}

		let commentList = await Comment.model.find({comment_protect_request_id: protectRequest._id}).populate('comment_writer_id').sort('-_id').exec();
		if (commentList.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}
		res.json({status: 200, msg: commentList});
	});
});

//대댓글 불러오기
router.post('/getChildCommentList', (req, res) => {
	controller(req, res, async () => {
		let childComments = await Comment.model.find({comment_parent: req.body.commentobject_id}).populate('comment_writer_id').sort('-_id').exec();

		if (childComments.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({status: 200, msg: childComments});
	});
});

//댓글에 좋아요 누름
router.post('/setLikeComment', (req, res) => {
	controllerLoggedIn(req, res, async () => {});
});

//좋아요 취소
router.post('/unsetLikeComment', (req, res) => {
	controllerLoggedIn(req, res, async () => {});
});

//=================================이전 router code =============================================================================

router.post(
	'/getChildCommentList',
	async (req, res) => {
		// if(req.session.user){
		console.log("%s %s [%s] %s %s %s | get child comment list of %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
		try {
			let commentList = await Comment.model
				.find()
				.where('parent')
				.equals(req.body.comment_id)
				.where('deleted')
				.equals(false)
				.populate('user', 'nickname profileImgUri')
				.sort('-_id')
				.exec();

			let likedList = undefined;
			if (commentList.length > 0) {
				likedList = await Like.model
					.find()
					.where('user')
					.equals(req.session.user_id)
					.where('target')
					.lte(commentList[0]._id)
					.gte(commentList[commentList.length - 1]._id)
					.where('deleted')
					.equals(false)
					.exec();
			}
			res.json({
				status: 200,
				msg: commentList,
				liked: likedList?.map((v, i) => v.target),
			});
		} catch (err) {
			console.error("%s %s [%s] %s %s %s | database error", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
			res.json({status: 500, msg: err});
		}
	},

	// else{
	// 	console.log("%s %s [%s] %s %s %s | unauthorized access", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
	// 	res.json({status: 401, msg: "Unauthorized"})
	// }
);

router.post(
	'/getCommentList',
	async (req, res) => {
		// if(req.session.user){
		console.log("%s %s [%s] %s %s %s | get comment list of %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
		try {
			let commentList = await Comment.model
				.find()
				.where('post')
				.equals(req.body.post_id)
				.where('parent')
				.equals(null)
				.where('deleted')
				.equals(false)
				.populate('user', 'nickname profileImgUri')
				.sort('-_id')
				.exec();

			let likedList = undefined;
			if (commentList.length > 0) {
				likedList = await Like.model
					.find()
					.where('user')
					.equals(req.session.user_id)
					.where('target')
					.lte(commentList[0]._id)
					.gte(commentList[commentList.length - 1]._id)
					.where('deleted')
					.equals(false)
					.exec();
			}
			res.json({
				status: 200,
				msg: commentList,
				liked: likedList?.map((v, i) => v.target),
			});
		} catch (err) {
			console.error("%s %s [%s] %s %s %s | database error", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
			res.json({status: 500, msg: err});
		}
	},

	// else{
	// 	console.log("%s %s [%s] %s %s %s | unauthorized access", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
	// 	res.json({status: 401, msg: "Unauthorized"})
	// }
);

router.post('/createComment', uploadS3.array('imgfile', 99), async (req, res) => {
	if (req.session.user_id) {
		console.log("%s %s [%s] %s %s %s | createComment by %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore

		var comment = new Comment.model({
			user: req.session.user_id,
			post: req.body.post_id,
			parent: req.body.parent_id !== '' && req.body.parent_id !== 'undefined' ? req.body.parent_id : undefined,
			comment: req.body.comment,
			images: req.files.map((v, i) => v.location),
			nickname: req.session.nickname,
		});
		comment.save(err => {
			if (err) {
				console.log('error during add comment to DB', err);
				res.json({status: 400, msg: err});
			}
			Post.model.findOne({_id: req.body.post_id}).exec((err, post) => {
				post.comment.shift();
				post.comment.unshift(comment);
				post.count_comment++;

				console.log(post);
				post.save(err => {
					if (err) {
						console.log('error during add commnet to DB', err);
						res.json({status: 400, msg: err});
					}
					console.log('successfully added comment to DB ' + req.body.post_id);

					res.json({
						status: 200,
						msg: comment,
						user: {
							_id: req.session.user_id,
							profileImgUri: req.session.profileImgUri,
							nickname: req.session.nickname,
						},
					});
				});
			});
		});
	} else {
		console.log("%s %s [%s] %s %s %s | unauthorized access", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
		res.json({status: 401, msg: 'Unauthorized'});
	}
});

router.post('/editComment', uploadS3.array('imgfile', 99), async (req, res) => {
	if (req.session.user_id) {
		console.log("%s %s [%s] %s %s %s | editComment by %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
		// console.log(req.body.images);
		// console.log(req.files);
		try {
			let result = await Comment.model.findOneAndUpdate(
				{
					_id: req.body.comment_id,
				},
				{
					$set: {
						comment: req.body.comment,
						images: req.files.length > 0 ? req.files.map((v, i) => v.location) : req.body.images ? req.body.images : [],
						upd_date: new Date(),
					},
				},
				{new: true, upsert: false},
			);
			res.json({
				status: 200,
				msg: result,
				user: {
					_id: req.session.user_id,
					profileImgUri: req.session.profileImgUri,
					nickname: req.session.nickname,
				},
			});
		} catch (err) {
			console.log('error during edit comment on DB', err);
			res.json({status: 400, msg: err});
		}
	} else {
		console.log("%s %s [%s] %s %s %s | unauthorized access", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
		res.json({status: 401, msg: 'Unauthorized'});
	}
});

//댓글에 좋아요를 누름
router.post('/likeComment', async (req, res) => {
	try {
		console.log("%s %s [%s] %s %s %s | likeComment by %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
		let result = await Like.model.findOneAndUpdate(
			{user: req.session.user_id, target: req.body.comment_id},
			{
				$set: {
					target: req.body.comment_id,
					upd_date: new Date(),
					deleted: false,
				},
			},
			{new: false, upsert: true, setDefaultsOnInsert: true},
		);
		if (result === null || result.deleted) {
			await Comment.model.findOneAndUpdate({_id: req.body.comment_id}, {$inc: {like_count: 1}});
		}
		res.json({status: 200, msg: result});
	} catch (err) {
		console.error("%s %s [%s] %s %s %s | database error : %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, JSON.stringify(err)); // prettier-ignore
		res.json({status: 500, msg: err});
	}
});

//댓글의 좋아요 취소
router.post('/dislikeComment', async (req, res) => {
	try {
		console.log("%s %s [%s] %s %s %s | dislikeComment by %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
		let result = await Like.model.findOneAndUpdate(
			{user: req.session.user_id, target: req.body.comment_id},
			{
				$set: {
					target: req.body.comment_id,
					upd_date: new Date(),
					deleted: true,
				},
			},
			{new: false, upsert: true, setDefaultsOnInsert: true},
		);
		if (result.deleted === null) {
			res.json({status: 400, msg: 'bad request'});
		}
		if (!result.deleted) {
			await Comment.model.findOneAndUpdate({_id: req.body.comment_id}, {$inc: {like_count: -1}});
		}
		res.json({status: 200, msg: result});
	} catch (err) {
		console.error("%s %s [%s] %s %s %s | database error : %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, JSON.stringify(err)); // prettier-ignore
		res.json({status: 500, msg: err});
	}
});

//댓글 삭제(실제 DB에서 삭제되지는 않음)
router.post('/deleteComment', async (req, res) => {
	try {
		console.log("%s %s [%s] %s %s %s | deleteComment by %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
		let result = await Comment.model.findOneAndUpdate(
			{_id: req.body.comment_id},
			{$set: {deleted: true}},
			{new: false, upsert: true, setDefaultsOnInsert: true},
		);
		// Post.model.findOneAndUpdate({_id:})
		if (result.deleted === null) {
			res.json({status: 400, msg: 'bad request'});
		}
		if (!result.deleted) {
			//   await Comment.model.findOneAndUpdate(
			//     { _id: req.body.comment_id },
			//     { $inc: { like_count: -1 } }
			//   );
		}
		res.json({status: 200, msg: result});
	} catch (err) {
		console.error("%s %s [%s] %s %s %s | database error : %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, JSON.stringify(err)); // prettier-ignore
		res.json({status: 500, msg: err});
	}
});

module.exports = router;
