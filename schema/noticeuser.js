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

	/** @type { String} 알림 대상 Object ID */
	notice_object: {type: Schema.Types.ObjectId},
	/** @type { String} 알림 대상 Object type */
	notice_object_type: {type: String},
	/** @type { String} 타겟 대상 Object ID */
	target_object: {type: Schema.Types.ObjectId},
	/** @type { String} 타겟 대상 Object type */
	target_object_type: {type: String},

	/** @type { String} 신청서일 경우 승인된 사용자 UserObjectID */
	notice_approved_applicant: {type: Schema.Types.ObjectId, ref: 'UserObject'},

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
