const express = require("express");
const router = express.Router();
const User = require("../schema/user");

router.post("/login", (req, res) => {
	console.log("%s %s [%s] %s %s %s | try to login %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.body.id); // prettier-ignore
	if (req.session.user !== undefined) {
		res.status(200);
		res.json({ status: 200, msg: req.session.user, user_id: req.session.user_id });
	} else {
		User.model.find()
			.where("id")
			.equals(req.body.id)
			.where("password")
			.equals(req.body.password)
			.exec((err, result) => {
				if (err) {
					console.error("%s %s [%s] %s %s %s | database error", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
					res.status(200);
					req.session.destroy((err) => {
						if(err){
						res.status(200);
						res.json({ status: 500, msg: "session error" });
						}
					});
					res.json({ status: 500, msg: "database error" });

				}
				if (result.length > 0) {
					console.log("%s %s [%s] %s %s %s | successfully login user => %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.body.id); // prettier-ignore
					req.session.user = req.body.id; //save user to session.
					req.session.user_id = result[0]._id;
					req.session.profileImgUri = result[0].profileImgUri;
					req.session.nickname = result[0].nickname;
					req.session.sid = req.signedCookies['connect.sid'];
					res.status(200);
					res.json({ status: 200, msg: req.body.id, sid: req.session.sid, user_id:req.session.user_id });
				} else {
					console.log("%s %s [%s] %s %s %s | cannot find user => %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.body.id); // prettier-ignore
					res.status(200);
					req.session.destroy((err) => {
						if(err){
						res.status(200);
						res.json({ status: 500, msg: "session error" });
						}
					});
					res.json({ status: 403, msg: 'cannot find user' });

				}
			});
	}
});

router.post("/logout", (req, res) => {
	console.log("%s %s [%s] %s %s %s | try to logout %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol, req.body.id); // prettier-ignore
	if (req.session) {
		console.log('delete session');
		req.session.destroy((err) => {
			if(err){
			res.status(200);
			res.json({ status: 500, msg: "logout failed" });
			}
		});
		res.status(200);
		res.json({ status: 200, msg: "logout sucess" });
	}
	else{
		console.log('no session');
		res.status(200);
		res.json({status:200, msg:'no session found'});
	}
});

router.get("/console", (req, res) => {
	console.log("%s %s [%s] %s %s %s", req.ip, new Date(), req.method, req.hostname, req.originalUrl, req.protocol); // prettier-ignore
	console.log(JSON.stringify(req.headers));
	res.send();
});

router.get("/test", (req, res) => {
	console.log("test api version 0");
	console.log(res.headersSent);
	console.log(req.headers);
	console.log("id" + JSON.stringify(req.query));
	req.session.profile = req.query.profile;
	req.session.sid = req.headers.cookie;
	if (req.session.num === undefined) req.session.num = 1;
	else req.session.num += 1;
	console.log(req.session);
	if (req.session.random === undefined) req.session.random = Math.random();
	// res.set('Content-Type','text/json');
	// res.send(`${req.session.num}번 접속 : `+`cookieid: ${JSON.stringify(req.cookies)}`);
	// res.send(`${JSON.stringify(req.cookies)}`);
	res.json(req.cookies);

	// console.log("session : " + req.session);
	// req.session.user_id = req.body.id;
	// console.log("sessioninfo : " + JSON.stringify(req.session));
	// res.send({ code: 200, msg: req.session.user_id });
});

module.exports = router;
