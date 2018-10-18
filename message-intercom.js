var intercom = require('intercom-client');
var config = require('./environment-config');
var request = require('request');

//incoming from twilio -- send to intercom
exports.execute = function (req, response, callback) {
    var token = config.intercom_token.prod;
    var client = new intercom.Client({
        token: token
    });

    var from = req.body.From;
    var body = req.body.Body;

    if(from.substring(0,1) != '+'){
        response.setHeader('Content-Type', 'text/plain');
        response.end();
        return null;
    }

    client.users.create({
       user_id: from
    }).then(function (r) {
        var userId = r.body.id;
        var phoneNum = r.body.user_id;

        var headers = {
            'Authorization': 'Bearer ' + token,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        request.get(
            {
                url:"https://api.intercom.io/conversations/?type=user&intercom_user_id=" + userId,
                headers:headers
            },
            function (error, res, bodyResponse) {
                var obj = JSON.parse(bodyResponse);

                if(obj.conversations == undefined || obj.conversations.length == 0){
                    var message = {
                        message_type: "email",
                        subject: "From Twilio with user phone number: " + phoneNum,
                        body: body,
                        from: {
                            type: "user",
                            id: userId
                        }
                    };

                    client.messages.create(message);

                    console.log('create message');
                }else{
                    var postData = {
                        "intercom_user_id": userId,
                        "body": body,
                        "type": "user",
                        "message_type": "comment"
                    };

                    postData = JSON.stringify(postData);

                    /* send reply to last convo */
                    request.post(
                        {
                            url: 'https://api.intercom.io/conversations/last/reply',
                            headers: headers,
                            body: postData
                        },
                        function (error, res, body) {
                            console.log('error ' + error);
                        }
                    );

                    console.log('reply message');
                }

                response.setHeader('Content-Type', 'text/plain');
                response.end();
            }
        );


    });
};