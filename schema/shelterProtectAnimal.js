
protect_animal_photos : Array<String>, //보호중인 동물 사진

protect_animal_rescue_date : Date, //보호중인 동물의 구조일자(보호소가 동물을 맡은 일자)
protect_animal_rescue_location : String, //보호중인 동물의 구조장소

protect_animal_species : String, //보호중인 동물의 종류(ex 개, 고양이, 토끼)
protect_animal_species_detail : String, //보호중인 동물의 종류(ex 리트리버, 푸들, 진돗개)
protect_animal_sex : Enum('male','female','unknown'), //보호중인 동물의 성별
protect_animal_neutralization : Enum('yes','no','unknown'), //중성화 여부
protect_animal_estimate_age : String, //보호중인 동물의 추정 연령
protect_animal_weight : String, //몸무게
protect_animal_status : Enum(‘rescue’,’adopt’,’protect’,’rainbowbridge’,’discuss’), //보호중인 동물의 상태 기본상태는 rescue임 (동물이 구조되어 보호소로 들어온 최초 상태) 임시보호가 되면 protect로 변경 입양을 가게 되면 상태가 adopt로 변경 임시보호, 입양 협의중이면 discuss로 변경 안락사, 혹은 폐사상태가 되면 rainbowbridge로 변경

protect_animal_writer_id : Mongodb_ID(ref:UserObject), //보호요청을 작성한 작성자(보호소)

protect_animal_protect_request_id : Mongodb_ID(ref:ProtectRequestObject), //보호요청 게시물
protect_animal_adoptor_id : Mongodb_ID(ref:UserObject), //입양자
protect_animal_protector_id : Mongodb_ID(ref:UserObject), //임시보호자
protect_animal_protector_discussion_id : Mongodb_ID(ref:UserObject), //입양, 임시보호 협의중인 유저