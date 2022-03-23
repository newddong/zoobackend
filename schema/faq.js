const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FAQObject = {
	/** @type { String} 자주 묻는 질문 제목 */
	faq_title: {type: String},
	/** @type { String} 자주 묻는 질문 내용 */
	faq_contents: {type: String},
	/** @type { Date} 업데이트 날짜 */
	faq_date: {type: Date, default: Date.now()},
};

/** @type {mongoose.Schema} */
const FAQSchema = new mongoose.Schema(FAQObject);

const model = mongoose.model('FAQObject', FAQSchema);

/** @type {(schema:FAQObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = FAQSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
