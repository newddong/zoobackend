const mongoose = require('mongoose');
const {stringify} = require('uuid');
const Schema = mongoose.Schema;

/** 쪽지 삭제 정보 */
const MemoboxDeleteInfo = {
	/** @type {String} 삭제한 유저 UserObject */
	deleted_user: {type: Schema.Types.ObjectId, ref: 'UserObject'},
	/** @type {String} 삭제한 날짜 */
	deleted_date: {type: Date},
};

/** 쪽지 신고 정보 */
const MemoboxReportInfo = {
	/** @type {String} 신고한 유저 UserObject */
	report_user: {type: Schema.Types.ObjectId, ref: 'UserObject'},
	/** @type {String} 신고한 날짜 */
	report_date: {type: Date},
};

const MemoBoxObject = {
	/** @type { String} 쪽지 송신 사용자 ID */
	memobox_send_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},
	/** @type { String} 쪽지 수신 사용자 ID */
	memobox_receive_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},
	/** @type { String} 쪽지 내용 */
	memobox_contents: {type: String},
	/** @type { Boolean} 쪽지 송신 날짜 */
	memobox_date: {type: Date, default: Date.now()},
	/** @type { MemoboxDeleteInfo} 쪽지를 삭제한 유저 및 날짜*/
	memobox_delete_info: [MemoboxDeleteInfo],
	/** @type { MemoboxReportInfo} 쪽지를 신고한 유저 및 날짜*/
	memobox_report_info: [MemoboxReportInfo],
};

/** @type {mongoose.Schema} */
const MemoBoxSchema = new mongoose.Schema(MemoBoxObject);

const model = mongoose.model('MemoBoxObject', MemoBoxSchema);

/** @type {(schema:MemoBoxObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = MemoBoxSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
