const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InterestsObject = {
	/** @type { String} 데이터 오브젝트의 타입 */
	type: {type: String, default: 'InterestsObject'},

	/** @type { Array.<String>} 관심사 지역 */
	interests_location: [{type: String}],

	/** @type { Array.<String>} 관심사 미용 */
	interests_beauty: [{type: String}],

	/** @type { Array.<String>} 관심사 놀이 */
	interests_activity: [{type: String}],

	/** @type { Array.<String>} 관심사 사료&간식 */
	interests_food: [{type: String}],

	/** @type { Array.<String>} 관심사 건강 */
	interests_health: [{type: String}],
};

/** @type {mongoose.Schema} */
const InterestsSchema = new mongoose.Schema(InterestsObject);
const model = mongoose.model('InterestsObject', InterestsSchema);

/** @type {(schema:InterestsObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = InterestsSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
