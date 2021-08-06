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
		.ne("").sort("-_id")
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

router.post("/createPost",uploadS3.array('imgfile',99), (req, res) => {
	if (req.session.user) {
        console.log("%s %s [%s] %s %s %s | createPost by %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.session.user); // prettier-ignore
		User.model
			.find()
			.where("id")
			.equals(req.session.user)
			.exec((err, user) => {
				console.log(user);
                console.log(req.files);
				var post = new Post.model({
					user: user[0],
					user_id: user[0].nickname,
					photo_user: user[0].profileImgUri,
					location: req.body.location,
					time: req.body.time,
					images: req.files.map((v,i)=>v.location),
					content: req.body.content,
					like: req.body.like,
					count_comment: req.body.count_comment,
				});
				post.save((err) => {
					if (err) {
						console.log("error during add user to DB", err);
						res.json({ status: 400, msg: err });
						// return;
					}
					console.log("successfully added user to DB " + req.body.id);
					res.json({ status: 200, msg: "successed" });
				});
			});
	} else {
		console.log("%s %s [%s] %s %s %s | unauthorized access", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
		res.json({ status: 401, msg: "Unauthorized" });
	}
});

router.post("/test", (req, res) => {
	console.log(req.body.test);
	User.model
		.find()
		.where("id")
		.equals(req.session.user)
		.exec((err, user) => {
			console.log(user);
			var post = new Post.model({
				user: user[0],
				user_id: user[0].nickname,
				photo_user: user[0].profileImgUri,
				location: req.body.location,
				time: req.body.time,
				images: req.body.images,
				content: req.body.content,
				like: req.body.like,
				count_comment: req.body.count_comment,
			});
			post.save((err) => {
				if (err) {
					console.log("error during add user to DB", err);
					res.json({ status: 400, msg: err });
					// return;
				}
				console.log("successfully added user to DB " + req.body.id);
				res.json({ status: 200, msg: "successed" });
			});
		});
});

module.exports = router;
