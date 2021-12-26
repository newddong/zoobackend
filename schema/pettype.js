const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PetTypeObject = {
	/** @type {String} 동물 대분류 */
	pet_species: {type: String},
	
	/** @type {Array.<String>} 동물 소분류 */
	pet_species_detail: [{type: String}],
};

/** @type {mongoose.Schema} */
const PetTypeSchema = new mongoose.Schema(PetTypeObject);

const model = mongoose.model('PetTypeObject', PetTypeSchema);

/** @type {(schema:FeedObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = PetTypeSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
