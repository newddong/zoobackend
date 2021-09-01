const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CommentSchema = new mongoose.Schema({
	user: {type:Schema.Types.ObjectId},
    post: {type:Schema.Types.ObjectId},
    parent: {type:Schema.Types.ObjectId},
    comment:{type:String},
    images:[{type:String}],
    like:{type:Number},
    reg_date:{type:Date,default:Date.now},
    upd_date:{type:Date,default:Date.now},
});

module.exports.schema = CommentSchema;
module.exports.model = mongoose.model("comment", CommentSchema);