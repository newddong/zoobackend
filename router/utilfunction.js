const User = require('../schema/user');



async function nicknameDuplicationCheck(req,res,nickname){
    const duplicateNickname = await User.model.find({user_nickname:nickname});
    if(duplicateNickname){
        res.status(400);
        res.json({status:400, msg:'중복된 닉네임을 입력하셨습니다.'});
        return
    }
}

module.exports.nicknameDuplicationCheck = nicknameDuplicationCheck;