const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CommentSchema = new mongoose.Schema({
	user: {type:Schema.Types.ObjectId,ref:'user'},
    post: {type:Schema.Types.ObjectId,ref:'post'},
    parent: {type:Schema.Types.ObjectId,ref:'comment'},
    comment:{type:String},
    images:[{type:String}],
    like_count:{type:Number,default:0},
    reg_date:{type:Date,default:Date.now},
    upd_date:{type:Date,default:Date.now},
    deleted:{type:Boolean,default:false}
});

module.exports.schema = CommentSchema;
module.exports.model = mongoose.model("comment", CommentSchema);