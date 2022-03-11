const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SettingPublicObject = {
	/** @type { String} 공개 설정 사용자 ID */
	setting_public_user_id: {type: Schema.Types.ObjectId, ref: 'UserObject', unique: true},
	/** @type { Date} 공개 설정 업데이트 날짜 */
	setting_public_update_date: {type: Date, default: Date.now()},
	/** @type { Boolean} 공개 설정 전체 공개 */
	setting_public_all: {type: Boolean, default: false},
	/** @type { Boolean} 공개 설정 내 피드 비공개 */
	setting_public_my_feed: {type: Boolean, default: false},
	/** @type { Boolean} 공개 설정 내 태그 게시글 비공개 */
	setting_public_my_tag_post: {type: Boolean, default: true},
	/** @type { Boolean} 공개 설정 내 커뮤니티 게시글 비공개 */
	setting_public_community_post: {type: Boolean, default: true},
};

/** @type {mongoose.Schema} */
const SettingPublicSchema = new mongoose.Schema(SettingPublicObject);

const model = mongoose.model('SettingPublicObject', SettingPublicSchema);

/** @type {(schema:SettingPublicObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = SettingPublicSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
