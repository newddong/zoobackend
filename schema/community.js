const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommunityObject = {
	/** 일반 필드 */
	/** @type { String} 데이터 오브젝트의 타입 */
	type: {type: String, default: 'CommunityObject'},
};

/** @type {mongoose.Schema} */
const CommunitySchema = new mongoose.Schema(CommunityObject);
const model = mongoose.model('CommunityObject', CommunitySchema);

/** @type {(schema:CommunityObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = CommunitySchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
