const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FavoriteEtcObject = {
	/** @type { String} 즐겨찾기를 누른 게시물의 오브젝트 아이디 */
	favorite_etc_target_object_id: {type: String},
	/** @type { String} 즐겨찾기를 누른 유저 */
	favorite_etc_user_id: {type: String, ref: 'UserObject'},
	/** @type { String} 즐겨찾기를 누른 컬렉션 */
	favorite_etc_collection_name: {type: String},

	/** @type { Date} 즐겨찾기 오브젝트가 처음 생성된 일시*/
	favorite_etc_date: {type: Date, default: Date.now},

	/** @type { Date} 즐겨찾기 오브젝트를 수정한 일시 */
	favorite_etc_update_date: {type: Date, default: Date.now},

	/** @type { Boolean} 즐겨찾기 오브젝트 삭제 여부 */
	favorite_etc_is_delete: {type: Boolean, default: false},
};

/** @type {mongoose.Schema} */
const FavoriteEtcSchema = new mongoose.Schema(FavoriteEtcObject);
const model = mongoose.model('FavoriteEtcObject', FavoriteEtcSchema);

/** @type {(schema:FavoriteEtcObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = FavoriteEtcSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
