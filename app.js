/*
 *  Made by Ethan Lee (@ethanlee16) and Kushal Tirumala (@kushaltirumala)
 *  Licensed under the MIT License.
 */

/* Change this to your Slack bot's OAuth token,
* found in the Integrations tab */
var SLACK_TOKEN = process.env.slackToken;
var CHANNEL = process.env.channel;

var https = require('https');
var  _ws = require('ws');
var r = require('./responses');

var counter = 1;
var ws, slackID;

https.get("https://slack.com/api/channels.create?token=" 
+ SLACK_TOKEN + "&name=donald_trump", function(res) {
    var data = "";
    res.on('data', function(chunk) {
        data += chunk;
    }).on('error', function(err) {
        console.log("Failed to create #trump channel. Verify "
            + "that you added your API key.");
    }).on('end', function() {
        console.log(data);
    });
});

https.get("https://slack.com/api/rtm.start?token=" + SLACK_TOKEN, function(res) {
    console.log("Connecting to Slack API...");
    var data = "";
    res.on('data', function(chunk) {
        data += chunk;
    }).on('error', function(err) {
    console.log("Failed to connect to Slack. "
        + "Did you put in your Slack bot's token in app.js?");
    }).on('end', function() {
        var rtm = JSON.parse(data);
        ws = new _ws(rtm.url);
        slackID = rtm.self.id;
        console.log("Logging into " + rtm.team.name + "'s Slack...");
        ws.on('open', function() {
            goTrump(rtm.team.name, CHANNEL);
        });
    })
});



function goTrump(teamName, channelID) {
    console.log("Donald Trump has joined " + teamName + "!");
    ws.send(JSON.stringify({
        "id": counter,
        "type": "message",
        "channel": channelID,
        "text": "LET'S MAKE " + teamName.toUpperCase() + " GREAT AGAIN."
    }));
    counter++;

    console.log("Listening for new messages...");
    ws.on('message', function(data) {
        var event = JSON.parse(data);
        if(event.type === "message" && event.user !== slackID) {
            ws.send(JSON.stringify({
                "id": counter,
                "type": "message",
                "channel": event.channel,
                "text": getResponse(event.text)
            }))
        }
        counter++;
    });
}

function getResponse(message) {
    for(var i = 0; i < r.length; i++) {
        for(var j = 0; j < r[i].keywords.length; j++) {
            if(message.toLowerCase().indexOf(r[i].keywords[j]) != -1) {
                console.log("Responding to message: " + message);
                return r[i].messages[Math.floor(Math.random() * r[i].messages.length)];
            }
        }
    }
}

