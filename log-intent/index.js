'use strict';
const aws = require('aws-sdk');
const uuidv4 = require('uuid/v4');
const dynamodb = new aws.DynamoDB();
// Update the Table name below
const tablename = process.env.TABLE_NAME;
const url = 'http://checkip.amazonaws.com/';
let response;

// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
exports.handler = (event, context, callback) => {
    try {
        // By default, treat the user request as coming from the America/New_York time zone.
        process.env.TZ = 'America/New_York';
        console.log(`event.bot.name=${event.bot.name}`);
        console.log(event);

        /**
         * Uncomment this if statement and populate with your Lex bot name, alias and / or version as
         * a sanity check to prevent invoking this Lambda function from an undesired source.
         */
        /*if (event.bot.name !== 'YourBotNameInLex') {
            callback('Invalid Bot Name');
        }*/

        const intentName = event.currentIntent.name;

        // Dispatch to your skill's intent handlers
        if (intentName === 'Greeting') {
            return greeting(event, callback);
        } else if (intentName === 'LogIntent') {
            return logIntent(event, callback);
        }
        throw new Error(`Intent with name ${intentName} not supported`);
        dispatch(event, (response) => loggingCallback(response, callback));
    } catch (err) {
        callback(err);
    }
};

// --------------- Helpers that build all of the responses -----------------------

function elicitSlot(sessionAttributes, intentName, slots, slotToElicit, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ElicitSlot',
            intentName,
            slots,
            slotToElicit,
            message,
        },
    };
}

function confirmIntent(sessionAttributes, intentName, slots, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ConfirmIntent',
            intentName,
            slots,
            message,
        },
    };
}

function close(sessionAttributes, fulfillmentState, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
        },
    };
}

function delegate(sessionAttributes, slots) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Delegate',
            slots
        },
    };
}

// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
function logIntent(event, callback) {
    try {
        let docClient = new aws.DynamoDB.DocumentClient({region: process.env.AWS_REGION});
        
        let item = {
            "currentIntent": event.currentIntent,
            "requestAttributes": event.requestAttributes,
            "sessionAttributes": event.sessionAttributes
        };
        item[PRIMARY_KEY] = uuidv4();
        let params = {
            TableName: tablename,
            Item: item
        };
        
        console.log(params);

        console.log('Putting to DynamoDB');
        docClient.put(params, function(err, data) {
            if(err) {
                console.log('Error occurred on DynamoDB put.');
                console.log(err);
                callback(err);
            } else {
                let callbackObj = {
                    dialogAction: {
                        type: 'Close',
                        fulfillmentState: "Fulfilled",
                        message: {
                            contentType: "PlainText",
                            content: "Thanks!"
                        }
                    }
                };
                console.log('got here!');
                console.log(callbackObj);
                callback(null, callbackObj);
            }
        });
    } catch (err) {
        callback(err);
    }
};



