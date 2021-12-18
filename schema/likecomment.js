const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const LikeCommentObject = {
    /** @type { String} 좋아요를 누른 댓글의 오브젝트 아이디 */
    like_comment_id : {type: String, ref:'CommentObject'},
    /** @type { String} 좋아요를 누른 유저 */
    like_comment_user_id : {type: String, ref:'UserObject'},

    /** @type { Date} 좋아요 오브젝트가 처음 생성된 일시*/
    like_comment_date : {type: Date, default: Date.now},

    /** @type { Date} 좋아요 오브젝트를 수정한 일시 */
    like_comment_update_date : {type: Date, default: Date.now},

    /** @type { Boolean} 좋아요 오브젝트 삭제 여부 */
    like_comment_is_delete: {type:Boolean, default: false},
};

/** @type {mongoose.Schema} */
const LikeCommentSchema = new mongoose.Schema(LikeCommentObject);
const model = mongoose.model('LikeCommentObject', LikeCommentSchema);

/** @type {(schema:LikeCommentObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = LikeCommentSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
