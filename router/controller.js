/**
 * 유저 로그인 여부를 처리
 * @param {*} req - 요청 express.js 객체
 * @param {*} res - 응답 express.js 객체
 * @param {*} fn - 수행할 작업
 */
async function controllerLoggedIn(req, res, fn) {
	console.log("ip - %s | date - [%s] | method - %s | protocol - %s | host - %s | path - %s | user - %s | excute API", req.ip, new Date(), req.method, req.protocol, req.hostname, req.originalUrl, req.session?.loginUser); // prettier-ignore
	if (req.session?.loginUser) {
		try {
			await fn();
		} catch (err) {
			console.log("ip - %s | date - [%s] | method - %s | protocol - %s | host - %s | path - %s | user - %s | DataBase Error", req.ip, new Date(), req.method, req.protocol, req.hostname, req.originalUrl, req.session?.loginUser); // prettier-ignore
			console.log(err);
			res.status(500);
			res.json({status: 500, msg: err + ''});
		}
	} else {
		console.log("ip - %s | date - [%s] | method - %s | protocol - %s | host - %s | path - %s | user - %s | Unauthorized Access", req.ip, new Date(), req.method, req.protocol, req.hostname, req.originalUrl, req.session?.loginUser); // prettier-ignore
		res.status(401);
		res.json({status: 401, msg: 'Unauthorized'});
	}
}

/**
 * 세션이 없어도 처리 가능한 절차
 * @param {*} req - 요청 express.js 객체
 * @param {*} res - 응답 express.js 객체
 * @param {*} fn - 수행할 작업
 */
async function controller(req, res, fn) {
	console.log("ip - %s | date - [%s] | method - %s | protocol - %s | host - %s | path - %s | user - %s | excute API", req.ip, new Date(), req.method, req.protocol, req.hostname, req.originalUrl, 'user not login'); // prettier-ignore
	try {
		await fn();
	} catch (err) {
		console.log("ip - %s | date - [%s] | method - %s | protocol - %s | host - %s | path - %s | user - %s | DataBase Error", req.ip, new Date(), req.method, req.protocol, req.hostname, req.originalUrl, 'user not login'); // prettier-ignore
		console.log(err);
		res.status(500);
		res.json({status: 500, msg: err + ''});
	}
}

module.exports.controllerLoggedIn = controllerLoggedIn;
module.exports.controller = controller;
