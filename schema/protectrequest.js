const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RecentComment = {
	/** @type { String} 동물보호 요청 게시물에 달린 최신 댓글의 db아이디 */
	comment_id: {type: String},
	/** @type { String} 댓글 작성자의 닉네임 */
	comment_user_nickname: {type: String},
	/** @type { String} 댓글의 내용 */
	comment_contents: {type: String},
};

const ProtectRequestObject = {
	/** 일반 필드 */
	/** @type { Array.<String>} 보호요청 게시물의 첨부사진 uri */
	protect_request_photos_uri: [{type: String}],
	/** @type { String} 보호요청 게시물 썸네일 uri */
	protect_request_photo_thumbnail: {type: String},
	/** @type { String} 보호중인 동물의 종류(ex 개, 고양이, 토끼) */
	protect_animal_species: {type: String},
	/** @type { String} 보호중인 동물의 종류(ex 리트리버, 푸들, 진돗개) */
	protect_animal_species_detail: {type: String},
	/** @type { String} 보호요청 게시물의 제목 */
	protect_request_title: {type: String},
	/** @type { String} 보호요청 게시물 내용  */
	protect_request_content: {type: String},

	/** 도큐먼트 관리정보(조회수,날자등 통계) */
	/** @type { Number} 보호요청 게시물 조회수 */
	protect_request_hit: {type: Number, default: 0},
	/** @type { Number} 보호요청 게시물을 즐겨찾기 한 숫자 */
	protect_request_favorite_count: {type: Number, default: 0},
	/** @type { Number} 보호요청 게시물 댓글의 수 */
	protect_request_comment_count: {type: Number, default: 0},
	/** @type { RecentComment} 게시글에 달린 최신 댓글 */
	protect_recent_comment: RecentComment,

	/** @type { Date} 보호요청 게시글 작성일시 */
	protect_request_date: {type: Date, default: Date.now, index: true},
	/** @type { Date} 보호요청 게시글 수정일시 */
	protect_request_update_date: {type: Date, default: Date.now},

	/** 다른 스키마와의 관계 */

	/** @type { String} 보호요청 게시물 작성자(보호소가 작성) */
	protect_request_writer_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},

	/** @type { String} 보호요청할 동물 */
	// protect_animal_id: {type: Schema.Types.ObjectId, ref: 'ShelterProtectAnimalObject'},
	protect_animal_id: {type: Object},

	/** @type { 'rescue'|'discuss'|'nearrainbow'|'complete'} 항목 추가 필요 입양가능(rescue), 보호소에서 구조가 이루어졌으므로 입양가능한 상태임, 협의중(discuss) 안락사 임박(nearrainbow) 완료(complete), 입양, 임시보호가 되면 보호요청 게시글은 완료 상태로 변경됨, 해당 동물은(adopt,protect)가 됨 사망(rainbowbridge) */
	protect_request_status: {type: String, default: 'rescue'},

	/** @type { Boolean} 삭제여부 */
	protect_request_is_delete: {type: Boolean, default: false},

	/** @type { Date} 공고기간 시작일 */
	protect_request_notice_sdt: {type: Date},

	/** @type { Date} 공고기간 끝일 */
	protect_request_notice_edt: {type: Date},

	/** @type { String} 유기번호 */
	protect_desertion_no: {type: Number, unique: true, index: true},

	/** @type { String} 공고번호 */
	protect_animal_noticeNo: {type: String},

	/** @type { String} 사진번호 */
	protect_picture_no: {type: Number, unique: true, index: true},
};

/** @type {mongoose.Schema} */
const ProtectRequestSchema = new mongoose.Schema(ProtectRequestObject);
const model = mongoose.model('ProtectRequestObject', ProtectRequestSchema);

/** @type {(schema:ProtectRequestObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = ProtectRequestSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
