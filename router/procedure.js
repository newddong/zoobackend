/**
 * 유저 로그인 여부를 처리
 * @param {*} req - 요청 express.js 객체
 * @param {*} res - 응답 express.js 객체
 * @param {*} fn - 수행할 작업
 */
function sessionProcedure(req, res, fn) {
	console.log("ip - %s | date - [%s] | method - %s | protocol - %s | host - %s | path - %s | user - %s", req.ip, new Date(), req.method, req.protocol, req.hostname, req.originalUrl, req.session.user); // prettier-ignore
	if (req.session.user_id) {
		try {
			fn();
		} catch (err) {
			console.error("ip - %s | date - [%s] | method - %s | protocol - %s | host - %s | path - %s | user - %s | DataBase Error", req.ip, new Date(), req.method, req.protocol, req.hostname, req.originalUrl, req.session.user); // prettier-ignore
			res.json({status: 500, msg: err});
		}
	} else {
		console.log("ip - %s | date - [%s] | method - %s | protocol - %s | host - %s | path - %s | user - %s | Unauthorized Access", req.ip, new Date(), req.method, req.protocol, req.hostname, req.originalUrl, req.session.user); // prettier-ignore
		res.json({status: 401, msg: 'Unauthorized'});
	}
}

/**
 * 세션이 없어도 처리 가능한 절차
 * @param {*} req - 요청 express.js 객체
 * @param {*} res - 응답 express.js 객체
 * @param {*} fn - 수행할 작업
 */
function procedure(req, res, fn) {
	console.log("ip - %s | date - [%s] | method - %s | protocol - %s | host - %s | path - %s | user - %s", req.ip, new Date(), req.method, req.protocol, req.hostname, req.originalUrl, req.session.user); // prettier-ignore
	try {
		fn();
	} catch (err) {
		console.error("ip - %s | date - [%s] | method - %s | protocol - %s | host - %s | path - %s | user - %s | DataBase Error", req.ip, new Date(), req.method, req.protocol, req.hostname, req.originalUrl, req.session.user); // prettier-ignore
		res.json({status: 500, msg: err});
	}
}

module.exports.sessionProcedure = sessionProcedure;
module.exports.procedure = procedure;