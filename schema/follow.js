const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FollowObject = {
	/** 일반 필드 */
	/** @type { String} 데이터 오브젝트의 타입 */
	type: {type: String, default: 'FollowObject'},
	/** @type { String} 팔로우를 대상(할) 유저 */
	follow_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},
	/** @type { String} 팔로우를 한 유저 */
	follower_id: {type: Schema.Types.ObjectId, ref: 'UserObject'},

	/** @type { Date} 팔로우 날자 */
	follow_date: {type: Date, default: Date.now},
	/** @type { Date} 팔로우 정보 수정일 */
	follow_update_date: {type: Date, default: Date.now},
	/** @type { Boolean} 팔로우 정보 삭제여부 */
	follow_is_delete: {type: Boolean, default: false},
};

/** @type {mongoose.Schema} */
const FollowSchema = new mongoose.Schema(FollowObject);

const model = mongoose.model('FollowObject', FollowSchema);

/** @type {(schema:FollowObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = FollowSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
