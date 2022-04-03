const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Road_address = {
	/** @type { String} 도로명 주소 */
	address_name: {type: String},
	/** @type { String} 시,도 */
	city: {type: String},
	/** @type { String} 구,군 */
	district: {type: String},
};

const Normal_Address = {
	/** @type { String} 지번 주소 */
	address_name: {type: String},
	/** @type { String} 시,도 */
	city: {type: String},
	/** @type { String} 구,군 */
	district: {type: String},
};

const Region = {
	/** @type { String} 위도 */
	latitude: {type: String},
	/** @type { String} 경도 */
	longitude: {type: String},
};

const Community_address = {
	/** @type { Road_address} 도로명 주소 */
	road_address: {type: Road_address},
	/** @type { Normal_Address} 지번 주소 */
	normal_address: {type: Normal_Address},
	/** @type { Region} 위도, 경도 */
	region: {type: Region},
};

const RecentComment = {
	/** @type { String} 피드에 달린 최신 댓글의 db아이디 */
	comment_id: {type: String},
	/** @type { String} 댓글 작성자의 닉네임 */
	comment_user_nickname: {type: String},
	/** @type { String} 댓글의 내용 */
	comment_contents: {type: String},
};

const CommunityObject = {
	/** 일반 필드 */
	/** @type { String} 데이터 오브젝트의 타입 */
	type: {type: String, default: 'CommunityObject'},
	/** @type { String} 커뮤니티 제목 */
	community_title: {type: String},
	/** @type { String} 커뮤니티 본문 (text, image, video 모두 html 형태로 저장) */
	community_content: {type: String},
	/** @type { String} 게시글 작성자의 db고유 아이디 */
	community_writer_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},
	/** @type { String} 주인공 동물로 지정한 반려동물 계정의 id, 작성자가 avatar_id로 클라이언트에 표시됨 */
	community_avatar_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},

	/** @type { RecentComment} 게시글에 달린 최신 댓글 */
	community_recent_comment: RecentComment,
	/** @type { Date} 커뮤니티  최초 작성일 */
	community_date: {type: Date, default: Date.now()},
	/** @type { Date} 커뮤니티  최종 업데이트 날짜 */
	community_update_date: {type: Date},
	/** @type { Boolean} 임시저장 여부 */
	community_is_temporary: {type: Boolean, default: false},
	/** @type { Boolean} 삭제 여부 */
	community_is_delete: {type: Boolean, default: false},
	/** @type { Boolean} 추천 게시물 여부 */
	community_is_recomment: {type: Boolean, default: false},
	/** @type { Boolean} 이미지, 동영상 첨부 여부 */
	community_is_attached_file: {type: Boolean, default: false},

	/** @type { String} 게시글의 타입 - 자유게시판(free) | 리뷰(review)  */
	community_type: {type: String, default: 'free'},
	/** @type { String} 자유게시판의 타입 - 잡담(talk) | 질문(qustion) | 모임(meeting) */
	community_free_type: {type: String},
	/** @type { String} 글 내용 동물 타입 - 개(doc) | 고양이(cat) | 그 외(etc) */
	community_animal_type: {type: String},
	/** @type { Object} 관심사 항목 키워드 (공통 코드에 의해 확장 가능) */
	community_interests: {type: Object},
	/** @type { Community_address} 리뷰 주소  */
	community_address: {type: Community_address},

	/** @type { Number} 게시글에 좋아요를 누른 수 */
	community_like_count: {type: Number, default: 0},
	/** @type { Number} 게시글을 즐겨찾기로 등록한 수 */
	community_favorite_count: {type: Number, default: 0},
	/** @type { Number} 게시글에 달린 댓글의 수(대댓글 포함) */
	community_comment_count: {type: Number, default: 0},
};

/** @type {mongoose.Schema} */
const CommunitySchema = new mongoose.Schema(CommunityObject);
const model = mongoose.model('CommunityObject', CommunitySchema);

/** @type {(schema:CommunityObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = CommunitySchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
