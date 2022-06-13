const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ShelterProtectAnimalObject = {
	/** 일반 필드 */
	/** @type { Array.<String>} 보호중인 동물 사진 */
	protect_animal_photo_uri_list: [{type: String}],
	/** @type { Date} 보호중인 동물의 구조일자(보호소가 동물을 맡은 일자) */
	protect_animal_rescue_date: {type: Date, default: Date.now},
	/** @type { String} 보호중인 동물의 구조장소 */
	protect_animal_rescue_location: {type: String},
	/** @type { String} 보호중인 동물의 종류(ex 개, 고양이, 토끼) */
	protect_animal_species: {type: String},
	/** @type { String} 보호중인 동물의 종류(ex 리트리버, 푸들, 진돗개) */
	protect_animal_species_detail: {type: String},
	/** @type { 'male'|'female'|'unknown'} 보호중인 동물의 성별 */
	protect_animal_sex: {type: String, default: 'unknown'},
	/** @type { 'yes'|'no'|'unknown'} 중성화 여부 */
	protect_animal_neutralization: {type: String, default: 'unknown'},
	/** @type { String} 보호중인 동물의 추정 연령 */
	protect_animal_estimate_age: {type: String},
	/** @type { String} 몸무게 */
	protect_animal_weight: {type: String},

	/** 다른 스키마와의 관계 */

	/** @type { 'rescue'|'adopt'|'protect'|'rainbowbridge'|'discuss'} 보호중인 동물의 상태 기본상태는 rescue임 (동물이 구조되어 보호소로 들어온 최초 상태) 임시보호가 되면 protect로 변경 입양을 가게 되면 상태가 adopt로 변경 임시보호, 입양 협의중이면 discuss로 변경 안락사, 혹은 폐사상태가 되면 rainbowbridge로 변경 */
	protect_animal_status: {type: String},

	/** @type { String} 보호요청을 작성한 작성자(보호소) */
	protect_animal_writer_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},

	/** @type { String} Mongodb_ID(ref:UserObject), //보호중인 동물이 속한 보호소 */
	protect_animal_belonged_shelter_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},

	/** @type { String} 보호요청 게시물 */
	protect_animal_protect_request_id: {type: Schema.Types.ObjectId, ref: 'ProtectRequestObject'},

	/** @type { String} 입양자 */
	protect_animal_adoptor_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},

	/** @type { String} 임시보호자 */
	protect_animal_protector_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},

	/** @type { Array.<String>} 입양, 임시보호 협의중인 유저 목록 */
	protect_animal_protector_discussion_id: [{type: Schema.Types.ObjectId, ref: 'UserObject'}],

	/** @type { Array.<String>} 보호활동 신청서 목록 */
	protect_act_applicants: [{type: Schema.Types.ObjectId, ref: 'ProtectionActivityApplicantObject'}],

	/** @type { String} 유기번호 */
	protect_desertion_no: {type: String},

	/** @type { String} 공고번호 */
	protect_animal_noticeNo: {type: String},
};

/** @type {mongoose.Schema} */
const ShelterProtectAnimalSchema = new mongoose.Schema(ShelterProtectAnimalObject);

const model = mongoose.model('ShelterProtectAnimalObject', ShelterProtectAnimalSchema);

/** @type {(schema:ShelterProtectAnimalObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = ShelterProtectAnimalSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
