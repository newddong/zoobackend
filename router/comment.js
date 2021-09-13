const express = require("express");
const router = express.Router();
const User = require("../schema/user");
const Post = require("../schema/post");
const Comment = require("../schema/comment");
const uploadS3 = require("../common/uploadS3");

router.post("/getChildCommentList", (req, res) => {
	// if(req.session.user){
	console.log("%s %s [%s] %s %s %s | get user profile of %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
	Comment.model
		.find()
		.where("parent")
		.equals(req.body.parent_id)
		.exec((err, result) => {
			if (err) {
				console.error("%s %s [%s] %s %s %s | database error", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
				res.json({ status: 500, msg: err });
			}
			res.json({ status: 200, msg: result });
		});
	// }
	// else{
	// 	console.log("%s %s [%s] %s %s %s | unauthorized access", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
	// 	res.json({status: 401, msg: "Unauthorized"})
	// }
});

router.post(
	"/getCommentList",
	async (req, res) => {
		// if(req.session.user){
		console.log("%s %s [%s] %s %s %s | get comment list of %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
		try {
			let commentList = await Comment.model
				.find()
				.where("post")
				.equals(req.body.post_id)
				.where("parent")
				.equals(null)
				.populate("user", "nickname profileImgUri")
				.sort("-_id")
				.exec();
			res.json({ status: 200, msg: commentList });
			
		} catch (err) {
			console.error("%s %s [%s] %s %s %s | database error", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
			res.json({ status: 500, msg: err });
		}
	}

	// else{
	// 	console.log("%s %s [%s] %s %s %s | unauthorized access", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
	// 	res.json({status: 401, msg: "Unauthorized"})
	// }
);

router.post("/createComment", uploadS3.array("imgfile", 99), async (req, res) => {
	if (req.session.user_id) {
		console.log("%s %s [%s] %s %s %s | createComment by %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore

		var comment = new Comment.model({
			user: req.session.user_id,
			// user:req.body.user_id,
			post: req.body.post_id,
			parent: req.body.parent_id !== "" ? req.body.parent_id : undefined,
			comment: req.body.comment,
			images: req.files?.map((v, i) => v.location),
		});
		comment.save((err) => {
			if (err) {
				console.log("error during add commnet to DB", err);
				res.json({ status: 400, msg: err });
			}
			Post.model.findOne({ _id: req.body.post_id }).exec((err, post) => {
				post.comment.shift();
				post.comment.unshift(comment);

				console.log(post);
				post.save((err) => {
					if (err) {
						console.log("error during add commnet to DB", err);
						res.json({ status: 400, msg: err });
					}
					console.log("successfully added comment to DB " + req.body.id);

					res.json({
						status: 200,
						msg: comment,
						user: { _id: req.session.user_id, profileImgUri: req.session.profileImgUri, nickname: req.session.nickname },
					});
				});
			});
		});
	} else {
		console.log("%s %s [%s] %s %s %s | unauthorized access", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
		res.json({ status: 401, msg: "Unauthorized" });
	}
});

//댓글에 좋아요를 누름
router.post("/likeComment", async (req, res) => {
	try {
		let result = await Like.model("likecomment").findOneAndUpdate(
			{ user: req.session.user_id, target: req.body.comment_id },
			{ $set: { target: req.body.comment_id, upd_date: new Date(), deleted: false } },
			{ new: false, upsert: true, setDefaultsOnInsert: true }
		);
		if (result === null || result.deleted) {
			await Post.model.findOneAndUpdate({ _id: req.body.comment_id }, { $inc: { like_count: 1 } });
		}
		res.json({ status: 200, msg: result });
	} catch (err) {
		console.error("%s %s [%s] %s %s %s | database error : %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, JSON.stringify(err)); // prettier-ignore
		res.json({ status: 500, msg: err });
	}
});

//댓글의 좋아요 취소
router.post("/dislikeComment", async (req, res) => {
	try {
		let result = await Like.model("likecomment").findOneAndUpdate(
			{ user: req.session.user_id, target: req.body.comment_id },
			{ $set: { target: req.body.comment_id, upd_date: new Date(), deleted: true } },
			{ new: false, upsert: true, setDefaultsOnInsert: true }
		);
		if (result.deleted === null) {
			res.json({ status: 400, msg: "bad request" });
		}
		if (!result.deleted) {
			await Post.model.findOneAndUpdate({ _id: req.body.comment_id }, { $inc: { like_count: -1 } });
		}
		res.json({ status: 200, msg: result });
	} catch (err) {
		console.error("%s %s [%s] %s %s %s | database error : %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, JSON.stringify(err)); // prettier-ignore
		res.json({ status: 500, msg: err });
	}
});

module.exports = router;
