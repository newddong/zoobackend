const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HelpByCategoryObject = {
	/** @type { String} 공통 코드 Object_ID (topic 카테고리) */
	help_by_category_common_code_id: {type: Schema.Types.ObjectId, ref: 'CommonCodeObject'},
	/** @type { String} 카테고리별 도움말 제목 */
	help_by_category_title: {type: String},
	/** @type { String} 카테고리별 도움말 내용 */
	help_by_category_contents: {type: String},
};

/** @type {mongoose.Schema} */
const HelpByCategorySchema = new mongoose.Schema(HelpByCategoryObject);
const model = mongoose.model('HelpByCategoryObject', HelpByCategorySchema);

/** @type {(schema:HelpByCategoryObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = HelpByCategorySchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
