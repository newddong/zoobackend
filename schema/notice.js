const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NoticeObject = {
	/** @type { String} 알림 사용자 ID */
	notice_user_id: {type: Schema.Types.ObjectId, ref: 'UserObject', unique: true},
	/** @type { Date} 알림 업데이트 날짜 */
	notice_update_date: {type: Date, default: Date.now()},
	/** @type { Boolean} 전체 알림 */
	notice_all: {type: Boolean, default: false},
	/** @type { Boolean} 팔로워 새 게시글 알림 */
	notice_newfollower: {type: Boolean, default: true},
	/** @type { Boolean} 즐겨찾은 보호요청 상태 변경 알림 */
	notice_favorite_protect_request: {type: Boolean, default: true},
	/** @type { Boolean} 반려동물의 접종 예정일 알림 */
	notice_pet_vaccination: {type: Boolean, default: true},
	/** @type { Boolean} 내 게시글 알림 */
	notice_my_post: {type: Boolean, default: true},
	/** @type { Boolean} 내 게시글에 달린 댓글 알림 */
	notice_comment_on_my_post: {type: Boolean, default: true},
	/** @type { Boolean}  나를 태그하거나 팔로우시 알림 */
	notice_tag_follower: {type: Boolean, default: true},
	/** @type { Boolean} 내 신청서 상태 변경시 알림 */
	notice_my_applicant: {type: Boolean, default: false},
	/** @type { Boolean} 공지 알림 */
	notice_alarm: {type: Boolean, default: true},
};

/** @type {mongoose.Schema} */
const NoticeSchema = new mongoose.Schema(NoticeObject);

const model = mongoose.model('NoticeObject', NoticeSchema);

/** @type {(schema:NoticeObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = NoticeSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
