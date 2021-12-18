const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const LikeFeedObject = {
    /** @type { String} 좋아요를 누른 피드의 오브젝트 아이디 */
    like_feed_id : {type: String, ref:'CommentObject'},
    /** @type { String} 좋아요를 누른 유저 */
    like_feed_user_id : {type: String, ref:'UserObject'},

    /** @type { Date} 좋아요 오브젝트가 처음 생성된 일시*/
    like_feed_date : {type: Date, default: Date.now},

    /** @type { Date} 좋아요 오브젝트를 수정한 일시 */
    like_feed_update_date : {type: Date, default: Date.now},

    /** @type { Boolean} 좋아요 오브젝트 삭제 여부 */
    like_feed_is_delete: {type:Boolean, default: false},
};

/** @type {mongoose.Schema} */
const LikeFeedSchema = new mongoose.Schema(LikeFeedObject);
const model = mongoose.model('LikeFeedObject', LikeFeedSchema);

/** @type {(schema:LikeCommentObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = LikeFeedSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
