const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Feed = require('../schema/feed');
const ShelterAnimal = require('../schema/shelterProtectAnimal');
const ProtectRequest = require('../schema/protectRequest');
const uploadS3 = require('../common/uploadS3');
const {controller, controllerLoggedIn} = require('./controller');
const {
	USER_NOT_VALID_TYPE,
    ALERT_NO_RESULT,
	LOGOUT_FAILED,
	LOGOUT_SUCCESS,
	ALERT_DUPLICATE_NICKNAME,
	ALERT_NOT_VALID_USEROBJECT_ID,
	USER_NOT_FOUND,
} = require('./constants');

//ㅇㄴㅁㅇㄹ
router.post('/',(req,res)=>{





})

//유저의 보호동물(프로필에서 보여지는) 목록 조회
router.post('/getUserProtectAnimalList',(req,res)=>{
    controller(req,res,async ()=>{
        let user = await User.model.findById(req.body.userobject_id).exec();
        console.log(user);
        if(user.user_type!='user'){
            //res.status(400);
            res.json({status:400,msg:USER_NOT_VALID_TYPE});
            return;
        }

        user = await User.model.findById(req.body.userobject_id)
        .populate({path:'user_my_pets',select:'user_type user_nickname user_profile_uri pet_status',match:{pet_status:'protect'}}).exec();
        
        if(user.user_my_pets.length<1){
            //res.status(404);
            res.json({status:404,msg:ALERT_NO_RESULT});
            return;
        }

        //res.status(200);
        res.json({status:200, msg: user.user_my_pets});
    });

});



module.exports = router;