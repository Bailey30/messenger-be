"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postConfirmationHandler = void 0;
// const AWS = require('aws-sdk');
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: 'eu-west-2' });
const dynamo = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const postConfirmationHandler = async (event, context, callback) => {
    console.log('EVENT', event);
    console.info('EVENT info\n' + JSON.stringify(event, null, 2));
    context.callbackWaitsForEmptyEventLoop = false;
    // By default, if callbackWaitsForEmptyEventLoop is true, the Lambda function will wait for the event loop to be empty before returning the response to the caller. Setting it to false allows the function to return immediately, without waiting for the event loop to be empty. This can be useful in scenarios where the function performs async operations that do not need to complete before the function returns, such as sending an email or updating a database.
    const params = {
        TableName: process.env.USERS_TABLE_NAME,
        Item: {
            cognitoid: event.request.userAttributes.sub,
            username: event.request.userAttributes.username,
            email: event.request.userAttributes.email,
        },
        ConditionExpression: 'attribute_not_exists(cognitoid)',
    };
    try {
        await dynamo.send(new lib_dynamodb_1.PutCommand(params));
        callback(null, {
            statusCode: 201,
            body: JSON.stringify(event.body),
        });
    }
    catch (err) {
        console.error(`Error adding item to table: ${err}`);
        callback(null, {
            statusCode: 500,
            body: JSON.stringify(err.message),
        });
        throw new Error(`Error adding item to table: ${err}`);
    }
    return event;
};
exports.postConfirmationHandler = postConfirmationHandler;
