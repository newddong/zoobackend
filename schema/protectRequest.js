const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProtectRequestObject = {
	/** @type { Array.<String>} 보호요청 게시물의 첨부사진 uri */
	protect_request_photos: [{type: String}],

	/** @type { String} 보호요청 게시물 썸네일 uri */
	protect_request_photo_thumbnail: {type: String},

	/** @type { String} 보호요청할 동물 */
	protect_animal_id: {type: Schema.Types.ObjectId},

	/** @type { String} 보호요청 게시물의 제목 */
	protect_request_title: {type: String},

	/** @type { String} 보호요청 게시물 내용  */
	protect_request_content: {type: String},

	/** @type { String} 보호요청 게시물 작성자 */
	protect_request_writer_id: {type: Schema.Types.ObjectId},

	/** @type { Number} 보호요청 게시물 조회수 */
	protect_request_hit: {type: Number},

	/** @type { Number} 보호요청 게시물을 즐겨찾기 한 숫자 */
	protect_request_favorite_count: {type: Number},

	/** @type { 'rescue'} 항목 추가 필요 입양가능(rescue), 보호소에서 구조가 이루어졌으므로 입양가능한 상태임, 협의중(discuss) 안락사 임박(nearrainbow) 완료(complete), 입양, 임시보호가 되면 보호요청 게시글은 완료 상태로 변경됨, 해당 동물은(adopt,protect)가 됨 사망(rainbowbridge) */
	protect_request_status: {type: String},

	/** @type { Date} 보호요청 게시글 작성일시 */
	protect_request_date: {type: Date},

	/** @type { Date} 보호요청 게시글 수정일시 */
	protect_request_update_date: {type: Date},

	/** @type { Number} 보호요청 게시물 댓글의 수 */
	protect_request_comment_count: {type: Number},
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
