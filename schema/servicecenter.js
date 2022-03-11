const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ServiceCenterObject = {
	/** @type { String} 자주 묻는 질문 (Frequently Asked Questions) */
	servicecenter_faq: {type: String},
	/** @type { String} 서비스 이용약관 (Terms of service) */
	servicecenter_tos: [{type: String}],
	/** @type { String} 위치 정보 이용 약관 (Terms of location) */
	servicecenter_tol: {type: String},
	/** @type { String} 개인정보처리 방침 */
	servicecenter_privacy_policy: {type: String},
};

/** @type {mongoose.Schema} */
const ServiceCenterSchema = new mongoose.Schema(ServiceCenterObject);

const model = mongoose.model('ServiceCenterObject', ServiceCenterSchema);

/** @type {(schema:ServiceCenterObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = ServiceCenterSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
