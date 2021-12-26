const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AddressObject = {
	/** @type { Number} 광역시도 코드*/
	// city_code: {type: Number},
	/** @type { String} 광역시도 */
	city: {type: String},
	
    /** @type { Number} 시군구 코드*/
	// district_code: {type: Number},
	/** @type { String} 시군구 */
	district: {type: String},

    /** @type { Number} 동읍면 코드*/
	// neighbor_code: {type: Number},
	/** @type { String} 동읍면 */
	neighbor: {type: String},


};

/** @type {mongoose.Schema} */
const AddressSchema = new mongoose.Schema(AddressObject);

const model = mongoose.model('AddressObject', AddressSchema);

/** @type {(schema:FeedObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = AddressSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
