const mongoose = require('mongoose');
const Schema = mongoose.Schema;





const VolunteerActivityApplicantObject = {
    /** @type { String} 봉사활동을 신청할 대상 보호소 오브젝트 아이디 */
    volunteer_target_shelter : {type: Schema.Types.ObjectId, ref: 'UserObject'},
    /** @type { String} 봉사활동 희망일자 */
    volunteer_wish_date : {type: String},
    /** @type { Array.<String>} 봉사활동에 공동으로 참여하는 유저의 오브젝트 목록 */
    volunteer_accompany : [{type: Schema.Types.ObjectId, ref: 'UserObject'}],
    /**  */
    volunteer_delegate_contact : {type: String},
};




/** @type {mongoose.Schema} */
const VolunteerActivityApplicantSchema = new mongoose.Schema(VolunteerActivityApplicantObject);

const model = mongoose.model('ShelterProtectAnimalObject', ShelterProtectAnimalSchema);

/** @type {(schema:ShelterProtectAnimalObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = ShelterProtectAnimalSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;