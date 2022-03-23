const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TermsOfServiceObject = {
	/** @type { String} 자주 묻는 질문 제목 */
	terms_of_service_title: {type: String},
	/** @type { String} 자주 묻는 질문 내용 */
	terms_of_service_contents: {type: String},
	/** @type { Date} 업데이트 날짜 */
	terms_of_service_date: {type: Date, default: Date.now()},
};

/** @type {mongoose.Schema} */
const TermsOfServiceSchema = new mongoose.Schema(TermsOfServiceObject);

const model = mongoose.model('TermsOfServiceObject', TermsOfServiceSchema);

/** @type {(schema:TermsOfServiceObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = TermsOfServiceSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
