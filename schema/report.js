const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReportObject = {
	/** @type { String} 신고자 UserObjectID */
	report_user_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},
	/** @type { String} 신고대상 오브젝트 ID */
	report_target_object_id: {type: Schema.Types.ObjectId},
	/** @type { Date} 신고대상 오브젝트 타입 */
	report_target_object_type: {type: String},
	/** @type { String} 신고이유 */
	report_target_reason: {type: String},
	/** @type { Date} 신고 날짜 */
	report_date: {type: Date, default: Date.now},
	/** @type { Date} 신고 수정 날짜 */
	report_update_date: {type: Date, default: Date.now},
	/** @type { Date} 신고 설정, 취소여부 */
	report_is_delete: {type: Boolean, default: false},
};

/** @type {mongoose.Schema} */
const ReportSchema = new mongoose.Schema(ReportObject);

const model = mongoose.model('ReportObject', ReportSchema);

/** @type {(schema:ReportObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = ReportSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
