'use strict';
const aws = require('aws-sdk');
const uuidv4 = require('uuid/v4');
const dynamodb = new aws.DynamoDB();
// Update the Table name below
const tableName = process.env.TABLE_NAME;
//const tableName = 'LexLog';
const primaryKey = process.env.PRIMARY_KEY;
//const primaryKey = 'LexLogId';

/**
 * This function expects Lex events and logs intents and
 * session variables to DynamoDB.
 * 
 * Incoming events are routed based on intent.
 */
exports.handler = (event, context, callback) => {
    try {
        // By default, treat the user request as coming from the America/New_York time zone.
        process.env.TZ = 'America/New_York';
        console.log(`event.bot.name=${event.bot.name}`);
        
        // Output the event in a JSON format we can easily copy and paste
        // from the Cloudwatch logs to facilitate debugging.
        console.log(JSON.stringify(event, null, 4));

        /**
         * Uncomment this if statement and populate with your Lex bot name, alias and / or version as
         * a sanity check to prevent invoking this Lambda function from an undesired source.
         */
        /*if (event.bot.name !== 'YourBotNameInLex') {
            callback('Invalid Bot Name');
        }*/

        // Get the intent name.  Intent names should match
        // what you see in the AWS Lex Console
        const intentName = event.currentIntent.name;

        // Dispatch to the correct intent handler
        if (intentName === 'Ping') {
            return ping(event, callback);
        } else if (intentName === 'LogIntent') {
            return logIntent(event, callback);
        }
        // Handle unknown intents
        throw new Error(`Intent with name ${intentName} not supported`);
    } catch (err) {
        callback(err);
    }
};

/**
 * This provides a quick way to check connectivity
 * between Lex and this function.
 */
function ping(event, callback) {
    let callbackObj = {
        dialogAction: {
            type: 'Close',
            fulfillmentState: "Fulfilled",
            message: {
                contentType: "PlainText",
                content: "Pong!"
            }
        }
    };
    callback(null, callbackObj);
}

/**
 * This is to hanlde the "LogIntent" intent.
 * Any intent phrases from LogIntent that Lex matches will be
 * logged here.
 * 
 * @param {} event 
 * @param {*} callback 
 */
function logIntent(event, callback) {
    try {
        let docClient = new aws.DynamoDB.DocumentClient({region: process.env.AWS_REGION});
        
        // Load the data we need to save from the input event into an object
        let item = {
            "currentIntent": event.currentIntent,
            "inputTranscript": event.inputTranscript,
            "requestAttributes": event.requestAttributes,
            "sessionAttributes": event.sessionAttributes
        };
        item[primaryKey] = uuidv4();
        let params = {
            TableName: tableName,
            Item: item
        };
        
        // Note the data object we are sending to DynamoDB
        console.log(JSON.stringify(params, null, 4));

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
                            content: "Logged!"
                        }
                    }
                };
                // Save the response we are sending back to Lex in
                // the Cloudwatch logs.
                console.log('Logged!');
                console.log(JSON.stringify(callbackObj, null, 4));
                callback(null, callbackObj);
            }
        });
    } catch (err) {
        callback(err);
    }
}
