const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const QandAObject = {
	/** @type { String} 공통 코드 Object_ID (topic 카테고리) */
	qanda_common_code_id: {type: Schema.Types.ObjectId, ref: 'CommonCodeObject'},
	/** @type { String} 문의한 사용자 */
	qanda_user_id: {type: Schema.Types.ObjectId, ref: 'UserObejct'},
	/** @type { String} 문의하기 상태 (wait 대기중| confirmming  관리자 확인중 | complete 답변완료) */
	qanda_status: {type: String},
	/** @type { String} 문의 제목 */
	qanda_question_title: {type: String},
	/** @type { String} 문의 내용 */
	qanda_question_contents: {type: String},
	/** @type { String} 답변 내용 */
	qanda_answer_contents: {type: String},
	/** @type { Date} 문의 날짜 */
	qanda_question_date: {type: Date, default: Date.now()},
	/** @type { Date} 문의 수정한 날짜 */
	qanda_question_update_date: {type: Date},
	/** @type { Date} 답변 날짜 */
	qanda_answer_date: {type: Date},
	/** @type { Date} 답변 수정한 날짜 */
	qanda_answer_update_date: {type: Date},
	/** @type { String} 삭제한 사용자 */
	qanda_delete_user_id: {type: Schema.Types.ObjectId, ref: 'UserObejct'},
	/** @type { Boolean} 삭제 여부 */
	qanda_is_delete: {type: Boolean, default: false},
	/** @type { Date} 삭제 날짜 */
	qanda_delete_date: {type: Date},
};

/** @type {mongoose.Schema} */
const QandASchema = new mongoose.Schema(QandAObject);
const model = mongoose.model('QandAObject', QandASchema);

/** @type {(schema:QandAObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = QandASchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
