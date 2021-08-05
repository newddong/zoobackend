const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const User = require("./user");

const PostSchema = new mongoose.Schema({
	user: {type:Schema.Types.ObjectId, ref:'user'},
    user_id:{type:String},
    photo_user:{type:String},
    location:{type:String},
    time:{type:String},
    images:[{type:String}],
    content:{type:String},
    like:{type:Number},
    count_comment:{type:Number},
    comment:[{type:String}],
    reg_date:{type:Date,default:Date.now},
    upd_date:{type:Date,default:Date.now},
});

module.exports.schema = PostSchema;
module.exports.model = mongoose.model("post", PostSchema);