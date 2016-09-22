const xml2js = require('xml2js');
const Client = require('node-rest-client').Client;
const request = require('request');
const http = require('http');

let builder = new xml2js.Builder();
let account = {
    authenticate: {
        header: {
            $: {
                login: "",
                password: "",
                timeout: 30
            }
        }
    }
};
let client = new Client();
let xml = builder.buildObject(account);

console.log(xml);
let args = {
    data: xml
};

/*request.post('http://vdoc-prod.vdocsuite.com/vdoc/navigation/flow?module=portal&cmd=authenticate', xml, function(err, res) {
    console.log(err, res);
});*/


let options = {
    host : "vdoc-prod.vdocsuite.com",
    path : '/vdoc/navigation/flow?module=portal&cmd=authenticate',
    method: "POST"
};

var req = http.request(options, function(res){
    res.setEncoding('utf8');
    var output='';
    res.on('data',function(chunk){
        output +=chunk;
        console.log('Print the chunk--> \n'+ chunk);
    });
    res.on('end',function(){
        console.log('Final Data is--> \n'+ output);
    });
});
req.on('error',function(e){
    console.log('the erro msg'+ e);
});
req.write(xml);
req.end();

/*client.post('http://vdoc-prod.vdocsuite.com/vdoc/navigation/flow?module=portal&cmd=authenticate', args, function (data, response) {
    console.log({args: args, body: data, error: response})
});*/