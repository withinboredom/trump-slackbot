/*
 *  Made by Ethan Lee (@ethanlee16) and Kushal Tirumala (@kushaltirumala)
 *  Licensed under the MIT License.
 */

/* Change this to your Slack bot's OAuth token,
* found in the Integrations tab */
const SLACK_TOKEN = process.env.slackToken;

const https = require('https');
const  _ws = require('ws');
const r = require('./responses');

let counter = 1;
let ws, slackID;

let inChannel = [];
let hunted = null;
const channelThrottle = new Map();
let throttleMs = 20000;
let maxHunt = 2;
let doHunt = false;
let me = null;

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
        me = rtm.self;
        ws = new _ws(rtm.url);
        slackID = rtm.self.id;
        console.log("Logging into " + rtm.team.name + "'s Slack...");
        ws.on('open', function() {
            rtm.channels.forEach((channel) => {
                if (channel.is_member) {
                    console.log(`Donald Trump is in channel: ${channel.id}!`);
                    inChannel.push(channel.id);
                }
            });
            rtm.groups.forEach((group) => {
                console.log(`Donald Trump is in group: ${group.id}`);
                inChannel.push(group.id);
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
    if ((doHunt || should === 10) && hunted === null) {
        if (channelThrottle.has(event.channel) && (new Date()) - channelThrottle.get(event.channel) <= throttleMs) {
            console.log(`Got throttled doing an interruption in ${event.channel}...`);
            return counter;
        }

        counter = say(event.channel, counter, "_wrong_");

        console.log(`Hunting ${event.user}`);
        hunted = {
            user: event.user,
            channel: event.channel,
            count: 1
        };

        channelThrottle.set(event.channel, new Date());
        return counter;
    }
    if (hunted !== null && hunted.user === event.user && hunted.channel === event.channel && hunted.count < maxHunt) {
        if (channelThrottle.has(event.channel) && (new Date()) - channelThrottle.get(event.channel) <= throttleMs) {
            console.log(`Got throttled doing an interruption in ${event.channel}...`);
            return counter;
        }

        counter = say(event.channel, counter, "_wrong_");

        hunted.count += 1;
        if (hunted.count >= maxHunt) {
            hunted = null;
            doHunt = false;
            console.log(`${event.user} has been hunted to death`);
        }

        channelThrottle.set(event.channel, new Date());
        return counter;
    }
}

function handleMessage(counter, event) {
    // don't flood a channel
    if (channelThrottle.has(event.channel) && (new Date()) - channelThrottle.get(event.channel) <= throttleMs) {
        console.log(`Got throttled in ${event.channel}...`);
        return counter;
    }

    const mention = `<@${me.id}>`;

    switch(true) {
        case event.text.startsWith(`${mention} throttle`):
            // set the throttle dynamically
            let ms = event.text.split(' ')[2];
            if (Number.isSafeInteger(Number.parseInt(ms))) {
                throttleMs = Number.parseInt(ms);
                counter = say(event.channel, counter, "But we need -- Lester, we need law and order.")
            }
            else {
                counter = say(event.channel, counter, "Typical politician. All talk, no action. Sounds good, doesn't work. Never going to happen.")
            }
            break;
        case event.text.startsWith(`${mention} interrupt`):
            // hunt the next person to start typing...
            let user = event.text.split(' ')[2];
            if (user !== undefined || user !== null) {
               hunted = {
                   user: user.substring(2, user.length - 1),
                   channel: event.channel,
                   count: 0
               }
            }
            doHunt = true;
            console.log('Interrupting the next person to speak');
            break;
        case event.text.startsWith(`${mention} never give up`):
            ms = event.text.split(' ')[4];
            if (Number.isSafeInteger(Number.parseInt(ms))) {
                maxHunt = ms;
            }
            console.log(`Set max interruptions to ${maxHunt}`);
            break;
        default:
            counter = say(event.channel, counter, getResponse(event.text));
            channelThrottle.set(event.channel, new Date());
            break;
    }

    return counter;
}

function say(channel, mId, message) {
    ws.send(JSON.stringify({
        "id": mId,
        "type": "message",
        "channel": channel,
        "text": message
    }));
    return mId + 1;
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

