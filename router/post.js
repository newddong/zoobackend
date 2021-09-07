const express = require("express");
const router = express.Router();
const User = require("../schema/user");
const Post = require("../schema/post");
const Like = require("../schema/like");
const uploadS3 = require("../common/uploadS3");

router.post("/getLikedPostId", async (req, res) => {
	// if(req.session.user){
	console.log("%s %s [%s] %s %s %s | getLikedPostId by %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
	try {
		let likedPost = await Like.model("likepost")
			.find()
			.where("user", req.session.user_id)
			.where("target")
			.lte(req.body.start_id)
			.gte(req.body.end_id)
			.where("deleted", false)
			.exec();
		res.json({
			status: 200,
			likedPost: likedPost?.map((v, i) => v.target),
		});
	} catch (err) {
		console.error("%s %s [%s] %s %s %s | database error", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
		res.json({ status: 500, msg: err });
	}
	// }
	// else{
	// 	console.log("%s %s [%s] %s %s %s | unauthorized access", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
	// 	res.json({status: 401, msg: "Unauthorized"})
	// }
});

//피드 홈 화면에서 게시물 리스트를 호출
router.post("/getPostList", async (req, res) => {
	// if(req.session.user){
	console.log("%s %s [%s] %s %s %s | getPostList by %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
	try {
		let postList = await Post.model
			.find()
			.where("id")
			.ne("")
			.sort("-_id")
			.limit(parseInt(req.body.number) || 2)
			.exec();
		if (Array.isArray(postList) && postList.length >= 1) {
			let likedPost = await Like.model("likepost")
				.find()
				.where("user", req.session.user_id)
				.where("target")
				.lte(postList[0]._id)
				.gte(postList[postList.length - 1]._id)
				.where("deleted", false)
				.exec();
			res.json({
				status: 200,
				msg: postList,
				index: 0,
				firstId: postList[0]._id,
				lastId: postList[postList.length - 1]._id,
				likedPost: likedPost?.map((v, i) => v.target),
			});
		} else {
			res.json({
				status: 200,
				msg: postList,
				index: 0,
				firstId: postList[0]._id,
				lastId: postList[postList.length - 1]._id,
				likedPost: [],
			});
		}
	} catch (err) {
		console.error("%s %s [%s] %s %s %s | database error", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
		res.json({ status: 500, msg: err });
	}
	// }
	// else{
	// 	console.log("%s %s [%s] %s %s %s | unauthorized access", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
	// 	res.json({status: 401, msg: "Unauthorized"})
	// }
});

router.post("/getMorePostList", async (req, res) => {
	//Scroll 시 Post의 리스트를 req.body.post_id기준으로 req.body.number개수만큼 더 불러옴
	//req.body.direction에 따라 post_id기준으로 이전, 이후로 나누어짐
	console.log("%s %s [%s] %s %s %s | getMorePostList %s by %s, post_ID : %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol,req.body.option, req.session.user,req.body.post_id); // prettier-ignore
	try {
		let result = await Post.model
			.find()
			.lt("_id", req.body.post_id)
			.sort("-_id")
			.limit(parseInt(req.body.number) || 2)
			.exec();

		if (Array.isArray(result) && result.length >= 1) {
			let likedPost = await Like.model("likepost")
				.find()
				.where("user", req.session.user_id)
				.where("target")
				.lte(result[0]._id)
				.gte(result[result.length - 1])
				.where("deleted", false)
				.exec();

			res.json({
				status: 200,
				msg: result,
				firstId: result[0]._id,
				lastId: result[result.length - 1]._id,
				likedPost: likedPost.map((v, i) => v.target),
			});
		} else {
			res.json({ status: 200, msg: [], firstId: result._id, lastId: result._id, length: 1 });
		}
	} catch (err) {
		console.error("%s %s [%s] %s %s %s | database error : %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, JSON.stringify(err)); // prettier-ignore
		res.json({ status: 500, msg: err });
	}
});

//유저 프로필에서 특정 게시물을 클릭하였을때 사용
router.post("/getPostListByUserId", async (req, res) => {
	//개요 : 특정한 유저가 작성한 특정 포스트를 기준으로 앞뒤 지정한 개수만큼의 포스트를 배열로 반환

	//전체 Post Collection의 Document중 user필드의 값이 요청된 req.body.user값과 동일한 Document리스트를
	//Document의 _id를 기준으로 정렬하여 req.body.numberX2개수만큼 응답(prev, next에 각각number개)
	console.log("%s %s [%s] %s %s %s | getPostListByUserId by %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
	try {
		let next = await Post.model
			.find()
			.where("user")
			.equals(req.body.user)
			.where("_id")
			.lte(req.body.post_id)
			.sort("-_id")
			.limit(parseInt(req.body.number) || 2)
			.exec();

		let prev = await Post.model
			.find()
			.where("user")
			.equals(req.body.user)
			.where("_id")
			.gt(req.body.post_id)
			.sort("_id")
			.limit(parseInt(req.body.number) || 2)
			.exec();

		if (!Array.isArray(next)) {
			//next는 req.body.post_id에 해당하는 post를 포함하므로 결과값이 없으면 안됨
			res.json({ status: 500, msg: "no result" });
		} else {
			if (!Array.isArray(prev) || prev.length === 0) {
				let likedPost = await Like.model("likepost")
					.find()
					.where("user", req.session.user_id)
					.where("target")
					.lte(next[0]._id)
					.gte(next[next.length - 1]._id)
					.where("deleted", false)
					.exec();
				console.log("liked Post");
				res.json({
					status: 200,
					msg: next,
					index: 0,
					firstId: next[0]._id,
					lastId: next[next.length - 1]._id,
					likedPost: likedPost.map((v, i) => v.target),
				});
			} else {
				let likedPost = await Like.model("likepost")
					.find()
					.where("user", req.session.user_id)
					.where("target")
					.lte(prev[0]._id)
					.gte(next[next.length - 1]._id)
					.where("deleted", false)
					.exec();
				res.json({
					status: 200,
					msg: prev.reverse().concat(next), //prev를 id역순으로 정렬
					index: prev.length,
					firstId: prev[0]._id,
					lastId: next[next.length - 1]._id,
					likedPost: likedPost.map((v, i) => v.target),
				});
			}
		}
	} catch (err) {
		console.error("%s %s [%s] %s %s %s | database error : %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, JSON.stringify(err)); // prettier-ignore
		res.json({ status: 500, msg: err });
	}
});

//게시물 페이징 처리 API
router.post("/getMorePostListByUserId", async (req, res) => {
	//Scroll 시 Post의 리스트를 req.body.post_id기준으로 req.body.number개수만큼 더 불러옴
	//req.body.direction에 따라 post_id기준으로 이전, 이후로 나누어짐
	console.log("%s %s [%s] %s %s %s | getMorePostListByUserId %s by %s, post_ID : %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol,req.body.option, req.session.user,req.body.post_id); // prettier-ignore
	try {
		let result = [];
		if (req.body.option === "prev") {
			result = await Post.model
				.find()
				.where("user")
				.equals(req.body.user)
				.gt("_id", req.body.post_id)
				.sort("_id")
				.limit(parseInt(req.body.number) || 2)
				.exec();
			if (result.length > 1) result.reverse();
		} else {
			result = await Post.model
				.find()
				.where("user")
				.equals(req.body.user)
				.lt("_id", req.body.post_id)
				.sort("-_id")
				.limit(parseInt(req.body.number) || 2)
				.exec();
		}

		if (Array.isArray(result) && result.length >= 1) {
			let likedPost = await Like.model("likepost")
				.find()
				.where("user", req.session.user_id)
				.where("target")
				.lte(result[0]._id)
				.gte(result[result.length - 1])
				.where("deleted", false)
				.exec();

			res.json({
				status: 200,
				msg: result,
				firstId: result[0]._id,
				lastId: result[result.length - 1]._id,
				length: result.length,
				likedPost: likedPost.map((v, i) => v.target),
			});
		} else {
			res.json({ status: 200, msg: [], firstId: result._id, lastId: result._id, length: 1 });
		}
	} catch (err) {
		console.error("%s %s [%s] %s %s %s | database error : %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, JSON.stringify(err)); // prettier-ignore
		res.json({ status: 500, msg: err });
	}
});

//게시물에 좋아요를 누름
router.post("/likePost", async (req, res) => {
	try {
		let result = await Like.model("likepost").findOneAndUpdate(
			{ user: req.session.user_id, target: req.body.post_id },
			{ $set: { target: req.body.post_id, upd_date: new Date(), deleted: false } },
			{ new: false, upsert: true, setDefaultsOnInsert: true }
		);
		if (result === null || result.deleted) {
			await Post.model.findOneAndUpdate({ _id: req.body.post_id }, { $inc: { like: 1 } });
		}
		res.json({ status: 200, msg: result });
	} catch (err) {
		console.error("%s %s [%s] %s %s %s | database error : %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, JSON.stringify(err)); // prettier-ignore
		res.json({ status: 500, msg: err });
	}
});

//게시물의 좋아요 취소
router.post("/dislikePost", async (req, res) => {
	try {
		let result = await Like.model("likepost").findOneAndUpdate(
			{ user: req.session.user_id, target: req.body.post_id },
			{ $set: { target: req.body.post_id, upd_date: new Date(), deleted: true } },
			{ new: false, upsert: true, setDefaultsOnInsert: true }
		);
		if (result.deleted === null) {
			res.json({ status: 400, msg: "bad request" });
		}
		if (!result.deleted) {
			await Post.model.findOneAndUpdate({ _id: req.body.post_id }, { $inc: { like: -1 } });
		}
		res.json({ status: 200, msg: result });
	} catch (err) {
		console.error("%s %s [%s] %s %s %s | database error : %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, JSON.stringify(err)); // prettier-ignore
		res.json({ status: 500, msg: err });
	}
});

//게시물 생성
router.post("/createPost", uploadS3.array("imgfile", 99), (req, res) => {
	if (req.session.user_id) {
		console.log("%s %s [%s] %s %s %s | createPost by %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
		User.model
			.findById(req.session.user_id)
			// .where("id")
			// .equals(req.session.user)
			.exec((err, user) => {
				console.log(user);
				console.log(req.files);
				var post = new Post.model({
					user: user._id,
					user_id: user.nickname,
					photo_user: user.profileImgUri,
					location: req.body.location,
					time: req.body.time,
					images: req.files.map((v, i) => v.location),
					content: req.body.content,
					like: req.body.like,
					count_comment: req.body.count_comment,
				});

				// user.postList.push(post._id);
				// user.save((err)=>{
				// 	console.log("successfully create post by " + req.session.user);
				// 	res.json({ status: 200, msg: "successed" });
				// })
				post.save((err) => {
					if (err) {
						console.log("error during add user to DB", err);
						res.json({ status: 400, msg: err });
						// return;
					}
					// user[0].postList.push(post);
					// user[0].save((err) => {
					// 	console.log(err);
					// });
					console.log("successfully added user to DB " + req.body.id);
					res.json({ status: 200, msg: "successed" });
				});
			});
	} else {
		console.log("%s %s [%s] %s %s %s | unauthorized access", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
		res.json({ status: 401, msg: "Unauthorized" });
	}
});

module.exports = router;
