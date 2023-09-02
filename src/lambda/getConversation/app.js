"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversation = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: 'eu-west-2' });
const dynamo = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const getConversation = async (event, context, callback) => {
    console.log(event);
    // take cognitoid of both users and search database for conversation that has those ids
    // if conversation doesnt exists, create new conversation
    callback(null, {
        statusCode: 200,
        body: JSON.stringify(event),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
};
exports.getConversation = getConversation;
