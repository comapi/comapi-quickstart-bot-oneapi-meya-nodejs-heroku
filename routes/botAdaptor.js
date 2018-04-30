/***************************************/
/* Comapi Meya.ai bot adaptor example. */
/***************************************/
var express = require("express");
var router = express.Router();
var cryptoJS = require("crypto-js");
var util = require("util");
var request = require("request");
var stringify = require('json-stable-stringify');
var mimeTypes = require("mime-types");

// Enter your Meya webhook key here
//const _meyaKey = "YOUR MEYA WEBHOOK KEY";
const _meyaKey = "Gac7hdzahZYpIKLZQP5Yi1WbaJhrvmjv";

// Enter your Comapi API Space Id here e.g. 11164198-3f3f-4993-ab8f-70680c1113b1
//const _yourComapiAPISpaceId = "YOUR_API_SPACE_ID";
const _yourComapiAPISpaceId = "c124cf6e-4352-4b26-a71a-c3032bea7a01";

// Enter your Comapi access token here
//const _yourComapiAccessToken = "YOUR_ACCESS_TOKEN";
const _yourComapiAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmZTY2MWEzOC01Yjk4LTQwODItODc5ZS05ZjVhMTJjYzFjODMiLCJpc3MiOiJodHRwczovL2FwaS5jb21hcGkuY29tL2FjY2Vzc3Rva2VucyIsImF1ZCI6Imh0dHBzOi8vYXBpLmNvbWFwaS5jb20iLCJhY2NvdW50SWQiOjM0NzI3LCJhcGlTcGFjZUlkIjoiYzEyNGNmNmUtNDM1Mi00YjI2LWE3MWEtYzMwMzJiZWE3YTAxIiwicGVybWlzc2lvbnMiOlsiY29udjpyYSIsImNvbnY6d2EiLCJjaGFuOnIiLCJmYjpzdGF0ZTp3YSIsIm1zZzphbnk6cyIsIm1zZzpyIiwicHJvZjpyYSIsInByb2Y6d2EiLCJhcGlzOnJvIl0sInN1YiI6ImZlNjYxYTM4LTViOTgtNDA4Mi04NzllLTlmNWExMmNjMWM4MyIsInByb2ZpbGVJZCI6IkFjbWUiLCJuYW1lIjoiQWxsIiwiaWF0IjoxNDkxODM1ODg3fQ.SQuOLNobU2h4tHOOBRwQcgrUffItiaqU1znkumrIn0A";

// Enter your Comapi webhook secret phrase
//const _yourWebhookSecret = "YOUR COMAPI WEBHOOK SECRET";
const _yourWebhookSecret = "A secret!";

///////////////////////////////////////
// GETs to easily check the page exists
router.get("/", function (req, res, next) {
  res.render("index", null);
});

router.get("/botInbound", function (req, res, next) {
  res.render("botInbound", null);
});

router.get("/botOutbound", function (req, res, next) {
  res.render("botOutbound", null);
});

////////////////////////////////////////////////////////////////////////////////
// Inbound handler will accept Comapi webhook events and convert to the bots API
router.post("/botInbound", function (req, res, next) {
  // Process data received from Comapi
  try {
    // Grab the body and parse to a JSON object
    if (req.body == null) {
      // No body, bad request.
      res.status(400).send("Bad request - No JSON body found!");
      return;
    }

    // We have a request body so lets look at what we have

    // First lets ensure it hasn"t been tampered with and it came from Comapi
    // We do this by checking the HMAC from the X-Comapi-Signature header
    let hmac = req.headers["x-comapi-signature"];

    if (hmac == null) {
      // No HMAC, invalid request.
      res.status(401).send("Invalid request: No HMAC value found!");
      return;
    } else {
      // Validate the HMAC, ensure you has exposed the rawBody, see app.js for how to do this
      let hash = cryptoJS.HmacSHA1(req.rawBody, _yourWebhookSecret);

      if (hmac != hash) {
        // The request is not from Comapi or has been tampered with
        res.status(401).send("Invalid request: HMAC hash check failed!");
        return;
      }
    }

    // All Ok
    var inboundEvent = req.body;

    // Log the event
    console.log("");
    console.log(util.format("Received a %s event id: %s", inboundEvent.name, inboundEvent.eventId));
    console.dir(inboundEvent, {
      depth: null,
      colors: true
    });

    // Is it an inbound message event?
    if (inboundEvent.name === "message.inbound") {
      // Pass onto Meya
      let meyaReq = null;
      let meyaReqUrl = null;

      // Is it text or a file?
      if (inboundEvent.payload.messageParts) {
        // Parts based
        meyaReq = {
          user_id: (inboundEvent.payload.from.profileId + "|" + encodeChannel(inboundEvent.payload.channel) + (inboundEvent.payload.channel === 'appMessaging' ? ("|" + inboundEvent.payload.to.conversationId) : "")),
          integration: "Webhook",
          url: inboundEvent.payload.messageParts[0].url
        };

        meyaReqUrl = "https://api.meya.ai/media";

        // Is it an image?
        if (inboundEvent.payload.messageParts[0].type.startsWith("image/")) {
          // Send as image          
          meyaReq.type = "image";
        } else if (inboundEvent.payload.messageParts[0].type.startsWith("audio/")) {
          // Send as audio
          meyaReq.type = "audio";
        } else if (inboundEvent.payload.messageParts[0].type.startsWith("video/")) {
          // Send as audio
          meyaReq.type = "video";
        } else {
          // Send as file
          meyaReq.type = "file";
        }

      } else {
        // Text based
        meyaReqUrl = "https://api.meya.ai/receive";

        meyaReq = {
          user_id: (inboundEvent.payload.from.profileId + "|" + encodeChannel(inboundEvent.payload.channel) + (inboundEvent.payload.channel === 'appMessaging' ? ("|" + inboundEvent.payload.to.conversationId) : "")),
          text: inboundEvent.payload.body,
          integration: "Webhook"
        };
      }

      console.log("");
      console.log("Calling Meya with the user message:");
      console.dir(meyaReq, {
        depth: null,
        colors: true
      });
      console.log("");

      request({
        method: "POST",
        url: meyaReqUrl,
        auth: {
          "user": _meyaKey,
          "pass": ""
        },
        timeout: 130000,
        json: true,
        body: meyaReq
      }, function (error, response, body) {
        if (error || response.statusCode != 200) {
          // General error
          let msg = util.format("Call to Meya failed with HTTP status code %s and message: %s", response.statusCode, response.statusMessage);
          console.log(msg);
          console.dir(response.body, {
            depth: null,
            colors: true
          });

          res.status(500).send(msg);
        } else {
          // Call succeeded
          console.log("Call to Meya succeeded");

          // All good return a 200
          res.status(200).send();
        }
      });
    } else {
      // Not an inbound.
      console.log("Not a message.inbound so ignoring!");
      res.status(200).send();
    }
  } catch (err) {
    // An error occurred
    let msg = "An error occurred receiving inbound bot messages, the error was: " + err;
    console.error(msg);
    res.status(500).send(msg);
  }
});

/////////////////////////////////////////////////////////
// Outbound messages, receive from bot and pass to Comapi
router.post("/botOutbound", function (req, res, next) {
  // Process data received from Comapi
  try {
    // Grab the body and parse to a JSON object
    if (req.body == null) {
      // No body, bad request.
      res.status(400).send("Bad request - No JSON body found!");
      return;
    }

    // We have a request body so lets look at what we have

    // First lets ensure it hasn't been tampered with and it came from Meya
    // We do this by checking the HMAC from the X-Meya-Signature header
    let hmac = req.headers["x-meya-signature"];

    if (hmac == null) {
      // No HMAC, invalid request.
      res.status(401).send("Invalid request: No HMAC value found!");
      return;
    } else {
      // Validate the HMAC, ensure you has exposed the rawBody, see app.js for how to do this
      let fullUrl = req.protocol + "://" + req.get("host") + req.originalUrl;
      console.log("Calculated URL for HMAC: " + fullUrl);
      let contentToValidate = fullUrl + orderedJsonStringify(req.body);
      let hash = cryptoJS.HmacSHA1(contentToValidate, _meyaKey);

      if (hmac != hash.toString(cryptoJS.enc.Base64)) {
        // The request is not from Comapi or has been tampered with
        res.status(401).send("Invalid request: HMAC hash check failed!");
        return;
      }
    }

    // Process the received event, remember you only have 3 secs to process
    let event = req.body;

    console.log("");
    console.log(util.format("Received a %s event", event.type));
    console.dir(event, {
      depth: null,
      colors: true
    });
    console.log("");

    // Split out the profile id and channel from the composite user id
    let userElements = event.user_id.split("|");

    if (event.sender == "bot") {
      // Setup Comapi request JSON
      var myRequest = {
        to: {
          profileId: userElements[0]
        },
        rules: [decodeChannel(userElements[1])]
      };

      // Is it a "text" type event from the bot?
      if (event.type == "text") {
        myRequest.body = event.text;
      }

      // Is it a "card" type event from the bot, yes so it is a media message.
      if (event.type == "card" && event.card.type == "image") {
        // Attach as multi part message
        let mimeType = mimeTypes.lookup(event.card.image_url);

        myRequest.messageParts = [{
          name: event.text,
          type: mimeType,
          url: event.card.image_url
        }];
      }

      // Add conversation id if present.
      if (userElements[2] != null) {
        myRequest.conversationId = userElements[2];
      }

      // Log out the JSON request
      console.log("");
      console.log("Calling Comapi with the bot message:");
      console.dir(myRequest, {
        depth: null,
        colors: true
      });

      // Send on to Comapi
      request({
        method: "POST",
        url: "https://api.comapi.com/apispaces/" + _yourComapiAPISpaceId + "/messages",
        headers: {
          "cache-control": "no-cache",
          "content-type": "application/json",
          "accept": "application/json",
          authorization: "Bearer " + _yourComapiAccessToken
        },
        timeout: 130000,
        json: true,
        body: myRequest
      }, function (error, response, body) {
        if (error || !(response.statusCode == 200 || response.statusCode == 201)) {
          // General error
          let msg = util.format("Call to Meya failed with HTTP status code %s and message: %s", response.statusCode, response.statusMessage);
          console.log(msg);
          console.dir(response.body, {
            depth: null,
            colors: true
          });

          res.status(500).send(msg);
        } else {
          // Call succeeded
          console.log("Call to Comapi succeeded");

          // All good return a 200
          res.status(200).send();
        }
      });
    } else {
      // Ignore event
      console.log("Not a outbound message from the bot, so ignoring!");
      res.status(200).send();
    }
  } catch (err) {
    // An error occurred
    let msg = "An error occurred receiving Outbound bot messages, the error was: " + err;
    console.error(msg);
    res.status(500).send(msg);
  }
});

// Help functions
/////////////////
function orderedJsonStringify(srcObject) {
  // Stringify and sort
  let result = stringify(srcObject);

  // Replace unicode characters with encoded versions
  result = result.replace(/[\u007F-\uFFFF]/g, function (chr) {
    return "\\u" + ("0000" + chr.charCodeAt(0).toString(16)).substr(-4);
  });

  return result;
}

function encodeChannel(channel) {
  switch (channel.toLowerCase()) {
    case "appmessaging":
      return "appm";
    default:
      return channel;
  }
}

function decodeChannel(channel) {
  switch (channel.toLowerCase()) {
    case "appm":
      return "appMessaging";
    default:
      return channel;
  }
}

// Export the module
////////////////////
module.exports = router;