const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NoticeUserObject = {
	/** @type { String} 소식 받는 사용자 UserObjectID */
	notice_user_receive_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},
	/** @type { String} 소식 관계자 UserObjectID */
	notice_user_related_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},
	/** @type { String} 소식 내용 (한글) */
	notice_user_contents_kor: {type: String},
	/** @type { String} 소식 내용 (영어) */
	notice_user_contents_eng: {type: String},
	/** @type { String} 소식 대상 컬렉션 ('follow'|팔로우, 'follower'|팔로워,'comment'|댓글,'tag'|태그,'favorite'|즐겨찾기,'like'|좋아요,'volunteer'|봉사활동신청서,'protect'|보호요청신청서)*/
	notice_user_collection: {type: String},
	/** @type { String} 소식 대상 ObjectID */
	notice_user_collection_object_id: {type: String},
	/** @type { Date} 소식 업데이트 날짜 */
	notice_user_date: {type: Date, default: Date.now()},
};

/** @type {mongoose.Schema} */
const NoticeUserSchema = new mongoose.Schema(NoticeUserObject);
const model = mongoose.model('NoticeUserObject', NoticeUserSchema);

/** @type {(schema:NoticeObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = NoticeUserSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
