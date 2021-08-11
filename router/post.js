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

router.post("/getPostListById", (req, res) => {
	// if(req.session.user){
	Post.model
		.find()
		.where("user")
		.equals(req.body.user)
		.lte("_id", req.body.post_id)
		.sort("-_id")
		.limit(20)
		.exec((err, result) => {
			if (err) {
				console.error("%s %s [%s] %s %s %s | database error", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
				res.json({ status: 500, msg: err });
			}
			// res.json({ status: 200, msg: result });
			res.json({ status: 200, msg: result, lastid: result[result.length-1]._id });
		});

	// }
	// else{
	// 	console.log("%s %s [%s] %s %s %s | unauthorized access", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
	// 	res.json({status: 401, msg: "Unauthorized"})
	// }
});

router.post("/getPrePostList",(req,res)=>{
	Post.model
		.find()
		.where("user")
		.equals(req.body.user)
		.gt("_id", req.body.post_id)
		.sort("-_id")
		.limit(20)
		.exec((err, result) => {
			if (err) {
				console.error("%s %s [%s] %s %s %s | database error", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
				res.json({ status: 500, msg: err });
			}
			res.json({ status: 200, msg: result });
			// res.json({ status: 200, msg: result, lastid: result[result.length-1]._id });
		});

})

router.post("/getAfterPostList",(req,res)=>{
	Post.model
		.find()
		.where("user")
		.equals(req.body.user)
		.lt("_id", req.body.post_id)
		.sort("-_id")
		.limit(20)
		.exec((err, result) => {
			if (err) {
				console.error("%s %s [%s] %s %s %s | database error", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
				res.json({ status: 500, msg: err });
			}
			res.json({ status: 200, msg: result });
			// res.json({ status: 200, msg: result, lastid: result[result.length-1]._id });
		});
})

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
