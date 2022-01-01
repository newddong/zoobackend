const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HashTagFeedObject = {
	/** 일반 필드 */
	/** @type { String} 데이터 오브젝트의 타입 */
	type: {type: String, default: 'HashTagFeedObject'},
    /** @type { Mongodb_ID(ref:HashTagObject)} 해시태그 주제, 키워드 */
	hashtag_id : {type: Schema.Types.ObjectId, ref:'HashTagObject'},
    /** @type { Mongodb_ID(ref:FeedObject)} 해시태그가 있는 피드 게시물 */
	hashtag_feed_id : {type: Schema.Types.ObjectId, ref:'FeedObject'},
    /** @type { Mongodb_ID(ref:ProtectRequestObject)} 해시태그가 있는 동물보호 게시물 */
	hashtag_protect_request_id : {type: Schema.Types.ObjectId, ref:'ProtectRequestObject'},
    
    /** @type { Date} 해시태그 생성일 */
	hashtag_feed_date : {type: Date, default: Date.now},
    /** @type { Date} 해시태그 수정일 */
	hashtag_feed_update_date : {type: Date, default: Date.now},

};

/** @type {mongoose.Schema} */
const HashTagFeedSchema = new mongoose.Schema(HashTagFeedObject);

const model = mongoose.model('HashTagFeedObject', HashTagFeedSchema);

/** @type {(schema:HashTagFeedObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = HashTagFeedSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
