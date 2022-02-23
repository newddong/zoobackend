const express = require('express');
const router = express.Router();
const Interests = require('../schema/interests');
const comment = require('../schema/comment');
const {controller, controllerLoggedIn} = require('./controller');

//피드(피드,실종,제보)댓글 리스트 불러오기
router.post('/getInterestsList', (req, res) => {
	controller(req, res, async () => {
		let interestsList = await Interests.model.find({}).exec();
		console.log('interestsList=>', interestsList);
		res.json({status: 200, msg: interestsList});
	});
});
module.exports = router;
