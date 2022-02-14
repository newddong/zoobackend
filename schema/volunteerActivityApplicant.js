const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VolunteerActivityApplicantObject = {
	/** @type { String} 봉사활동을 신청할 대상 보호소 오브젝트 아이디 */
	volunteer_target_shelter: {type: Schema.Types.ObjectId, ref: 'UserObject'},
	/** @type { Array.<Date>} 봉사활동 희망일자 */
	volunteer_wish_date: [{type: Date, default: Date.now}],
	/** @type { integer} 봉사활동 인원수 */
	volunteer_accompany_number: {type: Number, default: 1},
	/** @type { Array.<String>} 봉사활동에 공동으로 참여하는 유저의 오브젝트 목록 */
	volunteer_accompany: [{type: Schema.Types.ObjectId, ref: 'UserObject'}],
	/** @type { String} 봉사활동 신청 대표자 전화번호 */
	volunteer_delegate_contact: {type: String},
	/** @type { 'done'|'notaccept'|'accept'|'wating'|'cancel'} 봉사활동 신청 상태*/
	volunteer_status: {type: String, default: 'waiting'},
};

/** @type {mongoose.Schema} */
const VolunteerActivityApplicantSchema = new mongoose.Schema(VolunteerActivityApplicantObject);

const model = mongoose.model('VolunteerActivityApplicantObject', VolunteerActivityApplicantSchema);

/** @type {(schema:VolunteerActivityApplicantObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = VolunteerActivityApplicantSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
