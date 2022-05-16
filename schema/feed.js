const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Tag = {
	/** @type {String} 게시물에 태그된 유저의 db고유 아이디 */
	tag_user_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},
	/** @type {Number} 태그가 보여야할 사진 프레임에서 x좌표 */
	position_x: {type: Number},
	/** @type {Number} 태그가 보여야할 사진 프레임에서 y좌표 */
	position_y: {type: Number},
	pos: {
		x: {type: Number},
		y: {type: Number},
	},
	user: {type: Object},
};

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

const Feed_address = {
	/** @type { Road_address} 도로명 주소 */
	road_address: {type: Road_address},
	/** @type { Normal_Address} 지번 주소 */
	normal_address: {type: Normal_Address},
	/** @type { Region} 위도, 경도 */
	region: {type: Region},
	/** @type { String} 상세주소 내용 */
	detail: {type: String},
};

const FeedMedia = {
	/** @type { Boolean} 미디어가 동영상인지 여부를 판단 */
	is_video: {type: Boolean},
	/** @type { Number} 동영상일 경우 재생 시간 */
	duration: {type: Number},
	/** @type { String} 피드 첨부된 미디어의 aws s3 uri */
	media_uri: {type: String},
	/** @type {Array.<Tag>} 태그 */
	tags: [{type: Tag}],
};

const RecentComment = {
	/** @type { String} 피드에 달린 최신 댓글의 db아이디 */
	comment_id: {type: String},
	/** @type { String} 댓글 작성자의 닉네임 */
	comment_user_nickname: {type: String},
	/** @type { String} 댓글의 내용 */
	comment_contents: {type: String},
};

const FeedObject = {
	/** @type { String} 데이터 오브젝트의 타입 */
	type: {type: String, default: 'FeedObject'},
	/** @type { String} 피드 본문 */
	feed_content: {type: String},
	/** @type { String} 피드 썸네일(올린 이미지나 동영상의 썸네일 사용 - 사용자 이미지를 저용량 썸네일로 변환하는 툴의 구현 필요) */
	feed_thumbnail: {type: String},
	/** @type { Array.<FeedMedia>} 피드 미디어 */
	feed_medias: [FeedMedia],

	/** @type { Feed_address} 게시글의 작성 지역정보 */
	feed_location: {type: Feed_address},

	/** @type { Date} 피드 최초 작성일자 */
	feed_date: {type: Date, default: Date.now},
	/** @type { Date} 피드 최종 업로드 날자 */
	feed_update_date: {type: Date, default: Date.now},

	/** @type { 'feed'|'missing'|'report'} 게시글의 타잎, ‘일반게시물(feed)’,’실종게시물(missing)’,’제보게시물(report)’로 나뉨 */
	feed_type: {type: String, default: 'feed'},
	/** @type { Boolean} 임보일기일 경우 true */
	feed_is_protect_diary: {type: Boolean, default: false},

	/** @type { RecentComment} 게시글에 달린 최신 댓글 */
	feed_recent_comment: RecentComment,
	/** @type { String} 실종 동물의 종류(ex 강아지, 고양이, 토끼 등) */
	missing_animal_species: {type: String},
	/** @type { String} 실종 동물의 세부 종류(ex 리트리버, 불독, 진돗개 등) */
	missing_animal_species_detail: {type: String},
	/** @type { 'male'|'female'|'unknown'} 실종 동물의 성별 */
	missing_animal_sex: {type: String},
	/** @type { Number} 실종 동물의 나이 */
	missing_animal_age: {type: Number},
	/** @type { String} 실종 동물의 실종 지역 혹은 장소 */
	missing_animal_lost_location: {type: String},
	/** @type { String} 실종 동물의 제보를 받을 사람의 연락처 */
	missing_animal_contact: {type: String},
	/** @type { String} 실종 동물의 특징 */
	missing_animal_features: {type: String},
	/** @type { Date} 동물이 실종된 추정일자 */
	missing_animal_date: {type: Date, default: Date.now},

	/** @type { Date} 제보일자(해당 동물의 목격일) */
	report_witness_date: {type: Date, default: Date.now},
	/** @type { String} 제보장소(목격장소) */
	report_witness_location: {type: String},
	/** @type { String} 제보 동물의 종류(ex 강아지, 고양이, 토끼 등) */
	report_animal_species: {type: String},
	/** @type { String} 제보 동물의 세부 종류(ex 리트리버, 불독, 진돗개 등) */
	report_animal_species_detail: {type: String},
	/** @type { 'male'|'female'|'unknown'} 제보 동물의 성별 */
	report_animal_sex: {type: String},
	/** @type { String} 제보 동물의 나이 */
	report_animal_age: {type: String},
	/** @type { String} 제보자  연락처 */
	report_animal_contact: {type: String},
	/** @type { String} 제보 동물의 특징 */
	report_animal_features: {type: String},

	/** @type { Number} 게시글에 좋아요를 누른 수 */
	feed_like_count: {type: Number, default: 0},
	/** @type { Number} 게시글을 즐겨찾기로 등록한 수 */
	feed_favorite_count: {type: Number, default: 0},
	/** @type { Number} 게시글에 달린 댓글의 수(대댓글 포함) */
	feed_comment_count: {type: Number, default: 0},

	/** @type { String} 게시글 작성자의 db고유 아이디 */
	feed_writer_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},
	/** @type { String} 주인공 동물로 지정한 반려동물 계정의 id, 작성자가 avatar_id로 클라이언트에 표시됨 */
	feed_avatar_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},

	/** @type { Boolean} 게시글 삭제여부 */
	feed_is_delete: {type: Schema.Types.Boolean, default: false},
};

/** @type {mongoose.Schema} */
const FeedSchema = new mongoose.Schema(FeedObject);

const model = mongoose.model('FeedObject', FeedSchema);

/** @type {(schema:FeedObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = FeedSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
