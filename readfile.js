const fs = require('fs');

fs.readFile('./address.txt',{encoding:'utf-8'},function(err, data){
    console.log("파일 다 읽었음");

    console.log(data.split('\n'));
});


