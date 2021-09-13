const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const LikeSchema = new mongoose.Schema({
	user: {type:Schema.Types.ObjectId},
    target: {type:Schema.Types.ObjectId},
    reg_date:{type:Date,default:Date.now},
    upd_date:{type:Date,default:Date.now},
    deleted:{type:Boolean}
});

module.exports.schema = LikeSchema;
module.exports.model = mongoose.model("likepost", LikeSchema);