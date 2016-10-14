/*
 *  Made by Ethan Lee (@ethanlee16) and Kushal Tirumala (@kushaltirumala)
 *  Licensed under the MIT License.
 */

/* Change this to your Slack bot's OAuth token,
* found in the Integrations tab */
const SLACK_TOKEN = process.env.slackToken;

var https = require('https');
var  _ws = require('ws');
var r = require('./responses');

var counter = 1;
var ws, slackID;

let inChannel = [];
var hunted = null;

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
            rtm.channels.forEach((channel) => {
                if (channel.is_member) {
                    console.log(`Donald Trump has joined ${channel.id}!`);
                    inChannel.push(channel.id);
                }
            });
            goTrump();
        });
    })
});



function goTrump() {
    /*ws.send(JSON.stringify({
        "id": counter,
        "type": "message",
        "channel": channelID,
        "text": "LET'S MAKE " + teamName.toUpperCase() + " GREAT AGAIN."
    }));
    counter++;*/

    console.log("Listening for new messages...");
    ws.on('message', function(data) {
        var event = JSON.parse(data);
        if (event.type === "message" && event.user !== slackID) {
            counter = handleMessage(counter, event);
        }
        if (event.type === "channel_joined") {
            console.log(`Donald Trump has joined ${event.channel.id}!`);
            inChannel.push(event.channel.id);
        }
        if (event.type === "channel_left") {
            console.log(`Donald Trump has left ${event.channel.id}`);
            inChannel = inChannel.filter((t) => t !== event.channel.id);
        }
        if (event.type === "user_typing") {
            console.log('I hear someone typing...');
            counter = handleWrong(counter, event)
        }
    });
}

function handleWrong(counter, event) {
    const should = Math.floor((Math.random() * 100) + 1);
    const maxHunt = 2;
    if (should === 10 && hunted === null) {
        ws.send(JSON.stringify({
            id: counter,
            type: 'message',
            channel: event.channel,
            text: "_wrong_"
        }));
        console.log(`Hunting ${event.user}`);
        hunted = {
            user: event.user,
            channel: event.channel,
            count: 1
        };
        return counter + 1;
    }
    if (hunted !== null && hunted.user === event.user && hunted.channel === event.channel && hunted.count < maxHunt) {
        ws.send(JSON.stringify({
            id: counter,
            type: 'message',
            channel: event.channel,
            text: "_wrong_"
        }));
        hunted.count += 1;
        if (hunted.count >= maxHunt) {
            hunted = null;
            console.log(`${event.user} has been hunted to death`);
        }
        return counter + 1;
    }
}

function handleMessage(counter, event) {
    ws.send(JSON.stringify({
        "id": counter,
        "type": "message",
        "channel": event.channel,
        "text": getResponse(event.text)
    }));
    return counter + 1;
}

function getResponse(message) {
    for(var i = 0; i < r.length; i++) {
        for(var j = 0; j < r[i].keywords.length; j++) {
            if (message === undefined) return;
            
            if(message.toLowerCase().indexOf(r[i].keywords[j]) != -1) {
                console.log("Responding to message: " + message);
                return r[i].messages[Math.floor(Math.random() * r[i].messages.length)];
            }
        }
    }
}

