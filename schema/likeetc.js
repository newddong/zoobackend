const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LikeEtcObject = {
	/** @type { String} 좋아요를 누른 게시물의 오브젝트 아이디 */
	like_etc_post_id: {type: String},
	/** @type { String} 좋아요를 누른 유저 */
	like_etc_user_id: {type: String, ref: 'UserObject'},
	/** @type { String} 좋아요를 누른 컬렉션 */
	like_etc_collection: {type: String},

	/** @type { Date} 좋아요 오브젝트가 처음 생성된 일시*/
	like_etc_date: {type: Date, default: Date.now},

	/** @type { Date} 좋아요 오브젝트를 수정한 일시 */
	like_etc_update_date: {type: Date, default: Date.now},

	/** @type { Boolean} 좋아요 오브젝트 삭제 여부 */
	like_etc_is_delete: {type: Boolean, default: false},
};

/** @type {mongoose.Schema} */
const LikeEtcSchema = new mongoose.Schema(LikeEtcObject);
const model = mongoose.model('LikeEtcObject', LikeEtcSchema);

/** @type {(schema:LikeEtcObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = LikeEtcSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
