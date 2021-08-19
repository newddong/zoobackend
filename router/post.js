const express = require("express");
const router = express.Router();
const User = require("../schema/user");
const Post = require("../schema/post");
const uploadS3 = require("../common/uploadS3");

router.post("/getPost", (req, res) => {
	// if(req.session.user){
	console.log("%s %s [%s] %s %s %s | get user profile of %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
	Post.model
		.find()
		.where("id")
		.equals(req.session.user)
		.select("id name useType nickname profileImgUri")
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

router.get("/getPostList", (req, res) => {
	// if(req.session.user){
	console.log("%s %s [%s] %s %s %s | getPostList by %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
	Post.model
		.find()
		.where("id")
		.ne("")
		.sort("-_id")
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

router.post("/getPostListById", async (req, res) => {
	//개요 : 특정한 유저가 작성한 특정 포스트를 기준으로 앞뒤 지정한 개수만큼의 포스트를 배열로 반환

	//전체 Post Collection의 Document중 user필드의 값이 요청된 req.body.user값과 동일한 Document리스트를
	//Document의 _id를 기준으로 정렬하여 req.body.numberX2개수만큼 응답(prev, next에 각각number개)
	console.log("%s %s [%s] %s %s %s | getPostListById by %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
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
				res.json({ status: 200, msg: next, index: 0, firstId: next[0]._id, lastId: next[next.length - 1]._id });
			} else {
				//prev를 id역순으로 정렬
				res.json({
					status: 200,
					msg: prev.reverse().concat(next),
					index: prev.length,
					firstId: prev[0]._id,
					lastId: next[next.length - 1]._id,
				});
			}
		}
	} catch (err) {
		console.error("%s %s [%s] %s %s %s | database error : %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, JSON.stringify(err)); // prettier-ignore
		res.json({ status: 500, msg: err });
	}
});

router.post("/getMorePostList", async (req, res) => {
	//Scroll 시 Post의 리스트를 req.body.post_id기준으로 req.body.number개수만큼 더 불러옴
	//req.body.direction에 따라 post_id기준으로 이전, 이후로 나누어짐
	console.log("%s %s [%s] %s %s %s | getMorePostList by %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
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

		if (Array.isArray(result) && result.length > 1) {
			if (req.body.option === "prev") {
				res.json({ status: 200, msg: result, firstId: result[0]._id });
			} else {
				res.json({ status: 200, msg: result, lastId: result[result.length - 1]._id });
			}
		} else {
			res.json({ status: 200, msg: result, firstId: result._id, lastId: result._id });
		}
	} catch (err) {
		console.error("%s %s [%s] %s %s %s | database error : %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, JSON.stringify(err)); // prettier-ignore
		res.json({ status: 500, msg: err });
	}
});

router.post("/getAfterPostList", (req, res) => {
	Post.model
		.find()
		.where("user")
		.equals(req.body.user)
		.lt("_id", req.body.post_id)
		.sort("-_id")
		.limit(2)
		.exec((err, result) => {
			if (err) {
				console.error("%s %s [%s] %s %s %s | database error", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
				res.json({ status: 500, msg: err });
			}
			// res.json({ status: 200, msg: result });
			res.json({ status: 200, msg: result, lastId: result[result.length - 1]?._id });
		});
});

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

router.post("/test", (req, res) => {});

module.exports = router;
