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
		
        let hash = await Hash.makeNewdoc({
			
		});

		if(req.body.feed_avatar_id){
			feed.feed_avatar_id = req.body.feed_avatar_id;
		}

		if (req.files&&req.files.length > 0) {
			let feedMedia = typeof req.body.feed_medias=='string'?JSON.parse('[' + req.body.feed_medias + ']'):req.body.feed_medias;

			feed.feed_medias = req.files.map((v,i)=>{
				return {
					...feedMedia[i],					
					media_uri: v.location
				};
			})
			feed.feed_thumbnail=feed.feed_medias[0].media_uri;
		}
		
		
		let newFeed = await feed.save();
		res.json({status: 200, msg: newFeed});
	});
});

//키워드로 해시에 등록된 피드(실종/제보) 리스트를 검색
router.post('/getFeedsByHash', (req, res) => {
	controller(req, res, async () => {
		let hash = await Hash.model.findOne({hashtag_keyword: req.body.hashtag_keyword}).exec();
        if(!hash){
            res.json({status: 404, msg: '해당 해쉬 키워드가 생성되지 않았습니다.'});
            return;
        }

        let feeds = await HashFeed.model.find({hashtag_id:hash._id}).populate('hashtag_feed_id').sort('-_id').exec();


		res.json({status: 200, msg: feeds});
	});
});






module.exports = router;
