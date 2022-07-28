const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Feed = require('../schema/feed');
const Comment = require('../schema/comment');
const LikeComment = require('../schema/likecomment');
const ProtectRequest = require('../schema/protectrequest');
const Community = require('../schema/community');
const uploadS3 = require('../common/uploadS3');
const Notice = require('../schema/notice');
const NoticeUser = require('../schema/noticeuser');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');
const mongoose = require('mongoose');

//댓글 대댓글 작성
router.post('/createComment', uploadS3.single('comment_photo_uri'), (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let writer_id;
		let targetObject;
		let targetObject_ID;

		let comment = await Comment.makeNewdoc({
			comment_photo_uri: req.file?.location,
			comment_contents: req.body.comment_contents,
			comment_is_secure: req.body.comment_is_secure,
			comment_writer_id: req.session.loginUser,
		});

		//대댓글 작성하기
		let parentComment;
		if (req.body.commentobject_id && req.body.commentobject_id.length > 0) {
			parentComment = await Comment.model.findById(req.body.commentobject_id);
			if (parentComment) {
				children_count = await Comment.model.find({comment_parent: req.body.commentobject_id}).where('comment_is_delete').ne(true).count();
				comment.comment_parent_writer_id = parentComment.comment_writer_id;
				parentComment.children_count = children_count + 1;
				comment.comment_parent = req.body.commentobject_id;
			}
		} //부모 코멘트의 작성자를 설정(Secure기능을 이용하기 위함)

		if (req.body.feedobject_id && req.body.feedobject_id.length > 0) {
			comment.comment_feed_id = req.body.feedobject_id;
			targetObject_ID = req.body.feedobject_id;
			let targetFeed = await Feed.model.findById(req.body.feedobject_id);
			let comment_cnt = await Comment.model.find({comment_feed_id: req.body.feedobject_id}).where('comment_is_delete').ne(true).count();
			if (targetFeed) {
				//피드에서 최신 댓글 노출은 없애도록 협의(20220714-비밀댓글 및 작성자와의 관계에 따른 로직 복잡이유)
				// targetFeed.feed_recent_comment.comment_id = comment._id; //게시물에 달린 최신 댓글 설정(1개까지)
				// targetFeed.feed_recent_comment.comment_user_nickname = req.session.user_nickname; //코멘트 작성자의 닉네임
				// targetFeed.feed_recent_comment.comment_contents = comment.comment_contents; //코멘트 내용
				targetFeed.feed_comment_count = comment_cnt + 1;
				comment.comment_feed_writer_id = targetFeed.feed_writer_id; //댓글이 달린 피드의 작성자를 설정(Secure기능을 이용하기 위함)
				writer_id = targetFeed.feed_writer_id;
			}
			await targetFeed.save();
			targetObject = Feed;
		} else if (req.body.protect_request_object_id && req.body.protect_request_object_id.length > 0) {
			comment.comment_protect_request_id = req.body.protect_request_object_id;
			targetObject_ID = req.body.protect_request_object_id;
			let targetProtectRequest = await ProtectRequest.model.findById(req.body.protect_request_object_id);
			let comment_cnt = await Comment.model
				.find({comment_protect_request_id: req.body.protect_request_object_id})
				.where('comment_is_delete')
				.ne(true)
				.count();
			if (targetProtectRequest) {
				targetProtectRequest.protect_recent_comment.comment_id = comment._id; //게시물에 달린 최신 댓글 설정(1개까지)
				targetProtectRequest.protect_recent_comment.comment_user_nickname = req.session.user_nickname; //코멘트 작성자의 닉네임
				targetProtectRequest.protect_recent_comment.comment_contents = comment.comment_contents; //코멘트 내용
				targetProtectRequest.protect_request_comment_count = comment_cnt + 1;
				comment.comment_protect_request_writer_id = targetProtectRequest.protect_request_writer_id; //댓글이 달린 동물보호 요청 게시물의 작성자를 설정(Secure기능을 이용하기 위함)
				writer_id = targetProtectRequest.protect_request_writer_id;
			}
			await targetProtectRequest.save();
			targetObject = ProtectRequest;
		} else if (req.body.community_object_id && req.body.community_object_id.length > 0) {
			comment.comment_community_id = req.body.community_object_id;
			targetObject_ID = req.body.community_object_id;
			let targetCommunity = await Community.model.findById(req.body.community_object_id);
			let comment_cnt = await Comment.model.find({comment_community_id: req.body.community_object_id}).where('comment_is_delete').ne(true).count();
			if (targetCommunity) {
				targetCommunity.community_recent_comment.comment_id = comment._id; //게시물에 달린 최신 댓글 설정(1개까지)
				targetCommunity.community_recent_comment.comment_user_nickname = req.session.user_nickname; //코멘트 작성자의 닉네임
				targetCommunity.community_recent_comment.comment_contents = comment.comment_contents; //코멘트 내용
				targetCommunity.community_comment_count = comment_cnt + 1;
				comment.community_writer_id = targetCommunity.community_writer_id; //댓글이 달린 커뮤니티 게시물의 작성자를 설정(Secure기능을 이용하기 위함)
				writer_id = targetCommunity.community_writer_id;
			}
			await targetCommunity.save();
			targetObject = Community;
		}

		// comment_protect_request_id: req.body.comment_protect_request_id,
		//TODO : 댓글이 달린 보호요청 게시물의 작성자 설정(Secure기능을 이용하기 위함)
		(await parentComment) && parentComment.save();
		let newResult = await comment.save();

		//알림 내역에 댓글 관련 insert
		//게시물의 작성자 알림 내역 중 댓글 알림 'true' 여부 확인
		let checkNotice = await Notice.model.findOne({notice_user_id: writer_id});
		if (checkNotice != null && checkNotice.notice_my_post != null && checkNotice.notice_my_post) {
			//부모 댓글과 대댓글을 남긴 사람이 같을 경우 게시물에 대한 알림 메세지를 담지 않는다.
			if (
				parentComment != undefined && //부모댓글이 있다는 뜻 (현재 대댓글임)
				parentComment._id != req.session.loginUser && //로그인 아이디가 부모 댓글 아이디가 아니라 뜻. (같은 사람이 댓글을 쓰고 대댓글을 쓴게 아니란 뜻)
				req.body.commentobject_id != null && //댓글 아이디가 존재한다는 뜻
				!mongoose.Types.ObjectId(parentComment.comment_writer_id).equals(mongoose.Types.ObjectId(req.session.loginUser)) //부모 댓글 아이디와 현재 로그인한 아이디(대댓글 아이디)가 같지 않을 경우
			) {
				let select_opponent = await User.model.findById(parentComment.comment_writer_id);
				let select_loginUser = await User.model.findById(req.session.loginUser);
				let noticeUser = NoticeUser.makeNewdoc({
					notice_user_receive_id: parentComment.comment_writer_id,
					notice_user_related_id: req.session.loginUser,
					notice_user_contents_kor:
						select_loginUser.user_nickname +
						'님이 ' +
						select_opponent.user_nickname +
						'님의 댓글에 댓글을 남겼습니다. -댓글내용:' +
						req.body.comment_contents,
					notice_object: newResult._id,
					notice_object_type: Comment.model.modelName,
					target_object: targetObject_ID,
					target_object_type: targetObject.model.modelName,
					notice_comment_parent: parentComment._id,
					notice_user_date: Date.now(),
				});
				let resultNoticeUser = await noticeUser.save();

				let user = await User.model
					.findOneAndUpdate({_id: parentComment.comment_writer_id}, {$set: {user_alarm: true}}, {new: true, upsert: true, setDefaultsOnInsert: true})
					.lean();
			}
			//게시글을 작성한 사용자와 댓글을 남기는 사람이 같을 경우 게시물에 대한 알림 메세지를 담지 않는다.
			if (
				(writer_id != req.session.loginUser && parentComment == undefined) || //게시물 작성자와 댓글을 남기는 사용자가 같지 않을 경우 && 대댓글이 아닌 경우
				(parentComment != undefined &&
					parentComment.comment_writer_id != req.session.loginUser &&
					!mongoose.Types.ObjectId(writer_id).equals(mongoose.Types.ObjectId(parentComment.comment_writer_id)))
			) {
				let contents_kor = '';

				let select_opponent = await User.model.findById(writer_id);
				let select_loginUser = await User.model.findById(req.session.loginUser);
				if (comment.comment_is_secure == true && writer_id != req.session.loginUser && parentComment != undefined) {
					contents_kor = select_loginUser.user_nickname + '님이 ' + select_opponent.user_nickname + '님의 게시물에 비밀댓글을 남겼습니다.';
				} else {
					contents_kor =
						select_loginUser.user_nickname +
						'님이 ' +
						select_opponent.user_nickname +
						'님의 게시물에 댓글을 남겼습니다. -댓글내용:' +
						req.body.comment_contents;
				}
				let noticeUser = NoticeUser.makeNewdoc({
					notice_user_receive_id: writer_id,
					notice_user_related_id: req.session.loginUser,
					notice_user_contents_kor: contents_kor,
					notice_object: newResult._id,
					notice_object_type: Comment.model.modelName,
					target_object: targetObject_ID,
					target_object_type: targetObject.model.modelName,
					notice_user_date: Date.now(),
				});
				let resultNoticeUser = await noticeUser.save();
				let user = await User.model
					.findOneAndUpdate({_id: writer_id}, {$set: {user_alarm: true}}, {new: true, upsert: true, setDefaultsOnInsert: true})
					.lean();
			}

			req.body.commentobject_id;
		}

		res.json({status: 200, msg: newResult});
	});
});

//피드(피드,실종,제보)댓글 리스트 불러오기
router.post('/getCommentListByFeedId', (req, res) => {
	controller(req, res, async () => {
		let feed = await Feed.model.findById(req.body.feedobject_id).where('feed_is_delete').ne(true).lean();
		if (!feed) {
			res.json({status: 400, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}

		let commentList = await Comment.model
			.find({comment_feed_id: feed._id, comment_parent: {$exists: false}})
			.populate('comment_writer_id')
			.sort('-_id')
			.lean();
		if (commentList.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		let likedCommentList = [];
		if (req.body.login_userobject_id) {
			likedCommentList = await LikeComment.model.find({like_comment_user_id: req.body.login_userobject_id, like_comment_is_delete: false}).lean();
		}

		commentList = commentList.map(comment => {
			if (likedCommentList.find(likedComment => likedComment.like_comment_id == comment._id)) {
				return {...comment, comment_is_like: true};
			} else {
				return {...comment, comment_is_like: false};
			}
		});

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

		let commentList = await Comment.model.find({comment_protect_request_id: protectRequest._id}).populate('comment_writer_id').sort('-_id').lean();
		if (commentList.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		let likedCommentList = [];
		if (req.session.loginUser) {
			likedCommentList = await LikeComment.model.find({like_comment_user_id: req.session.loginUser, like_comment_is_delete: false}).lean();
		}

		commentList = commentList.map(comment => {
			if (likedCommentList.find(likedComment => mongoose.Types.ObjectId(likedComment.like_comment_id).equals(comment._id))) {
				return {...comment, comment_is_like: true};
			} else {
				return {...comment, comment_is_like: false};
			}
		});

		res.json({status: 200, msg: commentList});
	});
});

//대댓글 불러오기
router.post('/getChildCommentList', (req, res) => {
	controller(req, res, async () => {
		let childComments = await Comment.model.find({comment_parent: req.body.commentobject_id}).populate('comment_writer_id').sort('-_id').lean();

		if (childComments.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		let likedCommentList = [];
		if (req.body.login_userobject_id) {
			likedCommentList = await LikeComment.model.find({like_comment_user_id: req.body.login_userobject_id, like_comment_is_delete: false}).lean();
		}

		childComments = childComments.map(comment => {
			if (likedCommentList.find(likedComment => likedComment.like_comment_id == comment._id)) {
				return {...comment, comment_is_like: true};
			} else {
				return {...comment, comment_is_like: false};
			}
		});

		res.json({status: 200, msg: childComments});
	});
});

//댓글 삭제(실제 DB에서 삭제되지는 않음)
router.post('/deleteComment', (req, res) => {
	controller(req, res, async () => {
		let comments = await Comment.model.findById(req.body.commentobject_id).lean();
		let comment_writer_id = JSON.stringify(comments.comment_writer_id).replace(/\"/gi, '');

		//로그인 정보와 작성자가 일치한지 확인
		if (req.session.loginUser != comment_writer_id) {
			res.json({status: 400, msg: ALERT_NO_MATCHING});
			return;
		}

		let result = await Comment.model.findOneAndUpdate(
			{_id: req.body.commentobject_id},
			{$set: {comment_is_delete: true}},
			{new: true, upsert: true, setDefaultsOnInsert: true},
		);

		//댓글 삭제에 대한 알람 컬렉션의 필드 변경
		resultNoticeUser = await NoticeUser.model
			.findOneAndUpdate({notice_object: req.body.commentobject_id}, {$set: {notice_is_delete: true}})
			.where({notice_object_type: 'CommentObject'})
			.where({notice_user_related_id: req.session.loginUser});

		if (result.comment_protect_request_id != undefined) {
			let comment_cnt = await Comment.model
				.find({comment_protect_request_id: result.comment_protect_request_id})
				.where('comment_is_delete')
				.ne(true)
				.count();
			let resultCount = await ProtectRequest.model.findOneAndUpdate(
				{_id: comments.comment_protect_request_id},
				{$set: {protect_request_comment_count: comment_cnt}},
				{new: true, upsert: true, setDefaultsOnInsert: true},
			);
		} else if (result.comment_community_id != undefined) {
			let comment_cnt = await Comment.model.find({comment_community_id: result.comment_community_id}).where('comment_is_delete').ne(true).count();
			let resultCount = await Community.model.findOneAndUpdate(
				{_id: comments.comment_community_id},
				{$set: {community_comment_count: comment_cnt}},
				{new: true, upsert: true, setDefaultsOnInsert: true},
			);
		} else if (result.comment_feed_id != undefined) {
			//피드 게시물에 표기되는 댓글 총 개수 재정의
			let comment_cnt = await Comment.model.find({comment_feed_id: result.comment_feed_id}).where('comment_is_delete').ne(true).count();
			let resultCount = await Feed.model.findOneAndUpdate(
				{_id: comments.comment_feed_id},
				{$set: {feed_comment_count: comment_cnt}},
				{new: true, upsert: true, setDefaultsOnInsert: true},
			);
		}

		//부모 댓글에 표기되는 대댓글 총 개수 재정의 (comment_parent 필드가 있을 경우에는 진행)
		if (comments.comment_parent != undefined) {
			let parent_comment_cnt = await Comment.model.find({comment_parent: comments.comment_parent}).where('comment_is_delete').ne(true).count();
			let parent_comment = await Comment.model.findOneAndUpdate(
				{_id: comments.comment_parent},
				{$set: {children_count: parent_comment_cnt}},
				{new: true, upsert: true, setDefaultsOnInsert: true},
			);
		}
		res.json({status: 200, msg: result});
	});
});

//댓글 수정
router.post('/updateComment', uploadS3.single('comment_photo_uri'), (req, res) => {
	controller(req, res, async () => {
		let comments = await Comment.model.findById(req.body.commentobject_id).exec();
		let comment_writer_id = JSON.stringify(comments.comment_writer_id).replace(/\"/gi, '');

		//로그인 정보와 작성자가 일치한지 확인
		if (req.session.loginUser != comment_writer_id) {
			res.json({status: 400, msg: ALERT_NO_MATCHING});
			return;
		}

		//이미지만 삭제할 경우 속성 삭제
		if (req.body.comment_photo_remove) {
			comments.comment_photo_uri = undefined;
		}

		if (req.file) {
			comments.comment_photo_uri = req.file?.location;
		}

		if (req.body.comment_contents) {
			comments.comment_contents = req.body.comment_contents;
		}

		if (req.body.comment_is_secure != '') {
			comments.comment_is_secure = req.body.comment_is_secure;
		}

		comments.comment_update_date = Date.now();
		comments = await comments.save();
		res.json({status: 200, msg: comments});
	});
});

//댓글 좋아요/취소
router.post('/likeComment', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let targetComment = await Comment.model.findById(req.body.commentobject_id);
		if (!targetComment) {
			res.json({status: 404, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}

		let is_like = req.body.is_like;

		let likeComment = await LikeComment.model
			.findOneAndUpdate(
				{like_comment_id: targetComment._id, like_comment_user_id: req.body.userobject_id},
				{$set: {like_comment_update_date: Date.now(), like_comment_is_delete: !is_like}},
				{new: true, upsert: true},
			)
			.exec();
		targetComment = await Comment.model
			.findOneAndUpdate({_id: targetComment._id}, {$inc: {comment_like_count: is_like ? 1 : -1}}, {new: true})
			.exec();

		res.json({status: 200, msg: {likeComment: likeComment, targetComment: targetComment}});
	});
});

//커뮤니티 게시글 댓글 리스트 불러오기
router.post('/getCommentListByCommunityId', (req, res) => {
	controller(req, res, async () => {
		let community = await Community.model.findById(req.body.community_object_id).exec();

		if (!community) {
			res.json({status: 400, msg: ALERT_NOT_VALID_OBJECT_ID});
			return;
		}

		let commentList = await Comment.model
			.find({comment_community_id: community._id, comment_parent: {$exists: false}})
			.populate('comment_writer_id')
			.sort('-_id')
			.lean();
		if (commentList.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		let likedCommentList = [];
		if (req.session.loginUser) {
			likedCommentList = await LikeComment.model.find({like_comment_user_id: req.session.loginUser, like_comment_is_delete: false}).lean();
		}

		commentList = commentList.map(comment => {
			if (likedCommentList.find(likedComment => mongoose.Types.ObjectId(likedComment.like_comment_id).equals(comment._id))) {
				return {...comment, comment_is_like: true};
			} else {
				return {...comment, comment_is_like: false};
			}
		});

		res.json({status: 200, msg: commentList});
	});
});

//=================================이전 router code =============================================================================

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
