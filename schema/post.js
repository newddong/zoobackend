const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const User = require("./user");

const PostSchema = new mongoose.Schema({
	user: {type:Schema.Types.ObjectId},
    user_id:{type:String},
    photo_user:{type:String},
    location:{type:String},
    time:{type:String},
    images:[{
        isVideo:{type:Boolean},
        uri:{type:String},
        tags:[{
            x:{type:Number},
            y:{type:Number},
            user:{type:Object}
        }]
    }],
    content:{type:String},
    comment:[{type:Object}],
    like_count:{type:Number,default:0},
    count_comment:{type:Number,default:0},
    reg_date:{type:Date,default:Date.now},
    upd_date:{type:Date,default:Date.now},
    deleted:{type:Boolean,default:false}
});

module.exports.schema = PostSchema;
module.exports.model = mongoose.model("post", PostSchema);