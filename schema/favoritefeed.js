const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const FavoriteFeedObject = {
    /** @type { String} 좋아요를 누른 댓글의 오브젝트 아이디 */
    favorite_feed_id : {type: String, ref:'FeedObject'},
    /** @type { String} 좋아요를 누른 유저 */
    favorite_feed_user_id : {type: String, ref:'UserObject'},

    /** @type { Date} 좋아요 오브젝트가 처음 생성된 일시*/
    favorite_feed_date : {type: Date, default: Date.now},

    /** @type { Date} 좋아요 오브젝트를 수정한 일시 */
    favorite_feed_update_date : {type: Date, default: Date.now},

    /** @type { Boolean} 좋아요 오브젝트 삭제 여부 */
    favorite_feed_is_delete: {type:Boolean, default: false},
};

/** @type {mongoose.Schema} */
const FavoriteFeedSchema = new mongoose.Schema(FavoriteFeedObject);
const model = mongoose.model('FavoriteFeedObject', FavoriteFeedSchema);

/** @type {(schema:FavoriteFeedObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = FavoriteFeedSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
