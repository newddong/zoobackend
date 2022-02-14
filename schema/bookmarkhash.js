const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BookmarkHashTagObject = {
	/** 일반 필드 */
	/** @type { String} 데이터 오브젝트의 타입 */
	type: {type: String, default: 'BookmarkHashTagObject'},
	/** @type { String} 북마크된 해시태그 */
	bookmark_hashtag_id: {type: Schema.Types.ObjectId, ref: 'HashTagObject'},
	/** @type { String} 북마크한 유저 */
	bookmark_hashtag_user_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},

	/** @type { Date} 유저-해시태그 북마크 생성일시 */
	bookmark_hashtag_date: {type: Date, default: Date.now},
	/** @type { Date} 유저-해시태그  북마크 수정일시 */
	bookmark_hashtag_update_date: {type: Date, default: Date.now},
	/** @type { Boolean} 유저-해시태그  북마크 삭제여부 */
	bookmark_hashtag_is_delete: {type: Boolean, default : false},
};

/** @type {mongoose.Schema} */
const BookmarkHashTagSchema = new mongoose.Schema(BookmarkHashTagObject);

const model = mongoose.model('BookmarkHashTagObject', BookmarkHashTagSchema);

/** @type {(schema:BookmarkHashTagObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = BookmarkHashTagSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
