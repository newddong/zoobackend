const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FeedUserTagObject = {
	/** 일반 필드 */
	/** @type { String} 데이터 오브젝트의 타입 */
	type: {type: String, default: 'FeedUserTagObject'},
	/** @type { String} 유저가 태그된 피드 게시물 */
	usertag_feed_id: {type: Schema.Types.ObjectId, ref: 'FeedObject'},
	/** @type { String} 유저가 태그된 동물보호 게시글 */
	usertag_protect_request_id: {type: Schema.Types.ObjectId, ref: 'ProtectRequestObject'},
	/** @type { String} 게시물에 태그된 유저 */
	usertag_user_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},

	/** @type { Date} 유저-게시물 태그 생성일시 */
	usertag_date: {type: Date, default: Date.now},
	/** @type { Date} 유저-게시물 태그 수정일시 */
	usertag_update_date: {type: Date, default: Date.now},
	/** @type { Boolean} 유저-게시물 태그 삭제여부 */
	usertag_is_delete: {type: Boolean, default: false},
};

/** @type {mongoose.Schema} */
const FeedUserTagSchema = new mongoose.Schema(FeedUserTagObject);

const model = mongoose.model('FeedUserTagObject', FeedUserTagSchema);

/** @type {(schema:FeedUserTagObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = FeedUserTagSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
