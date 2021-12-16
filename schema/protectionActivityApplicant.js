const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CheckList = {
	/** @type { Boolean} 성인여부 */
	is_adult: {type: Boolean, default : false},

	/** @type { Boolean} 보호지 근처의 동물병원 여부 */
	is_near_veterinary: {type: Boolean, default : false},

	/** @type { Boolean} 가족, 동거인의 동의 여부 */
	is_agreed_housemate: {type: Boolean, default : false},

	/** @type { Boolean} 배변훈련 지식여부 */
	is_experience_defecate: {type: Boolean, default : false},

	/** @type { Boolean} 반려동물 미용,위생 지식여부 */
	is_knowledge_sanitation: {type: Boolean, default : false},
};

const Address = {
	/** @type { String} 시,도,군 */
	city: {type: String},

	/** @type { String} 구 */
	district: {type: String},

	/** @type { String} 읍,면,동 */
	neighbor: {type: String},
	
	/** @type {String} 검색주소 */
	brief: {type: String},

	/** @type {String} 검색주소(자세히) */
	detail: {type: String},

};

const CompanionHistory = {
	/** @type { String} */
	companion_pet_species: {type: String},

	/** @type { String} */
	companion_pet_age: {type: String},

	/** @type { String} */
	companion_pet_period: {type: String},

	/** @type { 'living'|'died'|'adopted'} 상태정보 카테고리 정해야함 */
	companion_pet_current_status: {type: String, default : 'living'},
};

const ProtectionActivityApplicantObject = {
	/** @type { 'protect'|'adopt'} 신청한 보호 활동의 종류, 임시보호(protect), 입양(adopt) */
	protect_act_type: {type: String},

	/** @type { Address} 보호 신청자의 주소 */
	protect_act_address: Address,

	/** @type { String} 보호 신청자의 전화번호 */
	protect_act_phone_number: {type: String},

	/** @type {Array.<CompanionHistory>} 보호 신청자의 반려생활 이력 */
	protect_act_companion_history: [CompanionHistory],

	/** @type { CheckList} 보호신청 체크리스트 */
	protect_act_checklist: CheckList,

	/** @type { String} 보호활동 신청동기 */
	protect_act_motivation: {type: String},

	/** @type { String} 보호활동 신청자 */
	protect_act_applicant_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},

	/** @type { String} 동물보호 게시글 */
	protect_act_request_article_id: {type: Schema.Types.ObjectId, ref:'ProtectRequestObject'},

	/** @type { String} 동물보호 게시글 작성한 보호소 */
	protect_act_request_shelter_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},
};

/** @type {mongoose.Schema} */
const ProtectionActivityApplicantSchema = new mongoose.Schema(ProtectionActivityApplicantObject);
const model = mongoose.model('ProtectionActivityApplicantObject', ProtectionActivityApplicantSchema);

/** @type {(schema:ProtectionActivityApplicantObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = ProtectionActivityApplicantSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
