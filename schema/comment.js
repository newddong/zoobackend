const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const CommentObject = {
	/** @type { String} 댓글 첨부 이미지 uri */
	comment_photo_uri: {type: String},

	/** @type { String} 댓글 내용 */
	comment_contents: {type: String,default:''},

	/** @type { Number} 댓글 좋아요 숫자 */
	comment_like_count: {type: Number,default:0},

	/** @type { Number} 댓글 싫어요 숫자(현재 기획에는 없음) */
	comment_dislike_count: {type: Number, default:0},

	/** @type { Number} 댓글 신고 숫자(신고기능과 연결, 관리자만 열람가능, 일반유저에게 공개할지 결정해야함) */
	comment_report_count: {type: Number,default:0},

	/** @type { Boolean} 댓글 신고로 인한 댓글 공개차단여부(true일 경우, ‘신고된 댓글입니다’로 내용 비공개 전환 */
	comment_report_block: {type: Boolean, default:false},

	/** @type { String} 대댓글이 달린 댓글의 ID */
	comment_parent: {type: Schema.Types.ObjectId,  ref:'CommentObject'},

	/** @type { String} 부모 댓글의 작성자 ID */
	comment_parent_writer_id: {type: Schema.Types.ObjectId, ref:'UserObejct'},

	/** @type { Date} 댓글 작성일시 */
	comment_date: {type: Date, default:Date.now},

	/** @type { Date} 댓글 최종 수정일시 */
	comment_update_date: {type: Date, default:Date.now},

	/** @type { String} 댓글 작성자 */
	comment_writer_id: {type: Schema.Types.ObjectId, ref:'UserObject'},

	/** @type { String} 댓글이 작성된 피드 게시물 */
	comment_feed_id: {type: Schema.Types.ObjectId,ref:'FeedObject'},

	/** @type { String} 댓글이 작성된 피드 게시물의 작성자 */
	comment_feed_writer_id: {type: Schema.Types.ObjectId,ref:'UserObject'},

	/** @type { String} 댓글이 작성된 동물보호 요청 게시물 */
	comment_protect_request_id: {type: Schema.Types.ObjectId},

	/** @type { String} 댓글이 작성된 동물보호 요청 게시물의 작성자 */
	comment_protect_request_writer_id: {type: Schema.Types.ObjectId,ref:'UserObject'},

	/** @type { Boolean} true일때는 writer와 댓글이 달린 게시글 작성자만 볼수있음, */
	comment_is_secure: {type: Boolean,default:false},

	/** @type { Boolean} 댓글의 삭제여부 */
	comment_is_delete: {type: Boolean,default:false},
};

/** @type {mongoose.Schema} */
const CommentSchema = new mongoose.Schema(CommentObject);
const model = mongoose.model('CommentObject', CommentSchema);

/** @type {(schema:CommentObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = CommentSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
