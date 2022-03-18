const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommonCodeObject = {
	/** @type { String} 컬렉션 이름 */
	common_code_c_name: {type: String},
	/** @type { String} 필드 이름 */
	common_code_f_name: {type: String},
	/** @type { String} 코드 값 */
	common_code_value: {type: String},
	/** @type { String} 한글 */
	common_code_msg_kor: {type: String},
	/** @type { String} 영문 */
	common_code_msg_eng: {type: String},
	/** @type { String} 카테고리 */
	common_code_category: {type: String},
	/** @type { Date} 코드 생성일 */
	common_code_create_date: {type: Date, default: Date.now},
	/** @type { Date} 코드 수정일 */
	common_code_update_date: {type: Date},
	/** @type { String} 추후 사용을 위한 임시 필드 */
	common_code_spare: {type: String},
};

/** @type {mongoose.Schema} */
const CommonCodeSchema = new mongoose.Schema(CommonCodeObject);
const model = mongoose.model('CommonCodeObject', CommonCodeSchema);

/** @type {(schema:CommonCodeObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = CommonCodeSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
