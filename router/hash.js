const express = require("express");
const router = express.Router();
const User = require("../schema/user");
const Hash = require("../schema/hash");
const HashFeed = require("../schema/hashfeed");
const uploadS3 = require("../common/uploadS3");
const {controller, controllerLoggedIn} = require('./controller');
const {USER_NOT_FOUND, ALERT_NOT_VALID_USEROBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MEDIA_INFO} = require('./constants');

//해쉬 생성
router.post('/createHash', (req, res) => {
	controller(req, res, async () => {
		res.json({status: 200, msg: newFeed});
	});
});

//키워드로 해시에 등록된 피드(실종/제보) 리스트를 검색
router.post('/getFeedsByHash', (req, res) => {
	controller(req, res, async () => {
		let hash = await Hash.model.findOne({hashtag_keyword: req.body.hashtag_keyword}).lean();
        if(!hash){
            res.json({status: 404, msg: '해당 해쉬 키워드가 생성되지 않았습니다.'});
            return;
        }

        let feeds = await HashFeed.model.find({hashtag_id:hash._id}).populate('hashtag_feed_id').sort('-_id').lean();

		let result = {hash: hash, feeds: feeds};
		res.json({status: 200, msg: result});
	});
});

//해시태그 키워드 검색
router.post('/getHashKeywords',(req, res) => {
	controller(req, res, async () => {
		let keywords = await Hash.model.find({hashtag_keyword: {$regex: req.body.hashtag_keyword}}).exec();
		res.json({status: 200, msg: keywords});
	});
});






module.exports = router;
