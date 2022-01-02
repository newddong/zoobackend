const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HashTagObject = {
	/** 일반 필드 */
	/** @type { String} 데이터 오브젝트의 타입 */
	type: {type: String, default: 'HashTagObject'},
	/** @type { String} 해시태그 주제, 키워드 */
    hashtag_keyword : {type: String},
    /** @type { Date} 해시태그 생성일 */
	hashtag_date : {type: Date, default: Date.now},
    /** @type { Date} 해시태그 업데이트 날자 */
	hashtag_update_date : {type: Date, default: Date.now},
	/** @type { Number} 해시태그에 연결된 게시물의 숫자 */
	hashtag_feed_count: {type: Number, default: 0},
};

/** @type {mongoose.Schema} */
const HashTagSchema = new mongoose.Schema(HashTagObject);

const model = mongoose.model('HashTagObject', HashTagSchema);

/** @type {(schema:HashTagObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = HashTagSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
