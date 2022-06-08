const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PublicDataBySchedulerObject = {
	/** @type { String} 수집정보 진행일 */
	process_date: {type: Date, default: Date.now},

	/** @type { String} 수집정보 시작일 */
	sdate: {type: String},

	/** @type { String} 수집정보 종료일 */
	edate: {type: String},

	/** @type { String} 공고번호 */
	noticeNo: {type: String},

	/** @type { String} 신규 보호소 정보 수집 : new_shelter, 요청 게시물 수집 : new_request, 요청 게시물 업데이트 : update_request, 리포트 : report */
	type: {type: String},

	/** @type { String} 타겟 컬렉션 */
	target_collection: {type: String},

	/** @type { String} 타겟 object_id */
	target_id: {type: Schema.Types.ObjectId},

	/** @type { String} 이전 상태 */
	old_status: {type: String},

	/** @type { String } 새로운 상태 */
	new_status: {type: String},

	/** @type { String} 크롤링 주소 */
	url: {type: String},

	/** @type { Number} 수집 날짜 대상 totalCount */
	totalCount_on_date: {type: Number},

	/** @type { Number} 새로운 신규 데이터 Count */
	count_new_data: {type: Number},

	/** @type { Number} 업데이트 된 데이터 Count */
	count_update_data: {type: Number},
};

/** @type {mongoose.Schema} */
const PublicDataBySchedulerSchema = new mongoose.Schema(PublicDataBySchedulerObject);
const model = mongoose.model('PublicDataBySchedulerObject', PublicDataBySchedulerSchema);

/** @type {(schema:PublicDataBySchedulerObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = PublicDataBySchedulerSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
