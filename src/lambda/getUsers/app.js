"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsersHandler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: 'eu-west-2' });
const dynamo = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const getUsersHandler = async (event, context, callback) => {
    try {
        const params = {
            TableName: process.env.USERS_TABLE_NAME,
            ExpressionAttributeNames: { '#onlineStatus': 'onlineStatus' },
            ExpressionAttributeValues: { ':onlineStatus': { S: 'online' } },
            FilterExpression: '#onlineStatus = :onlineStatus',
        };
        const onlineUsers = await dynamo.send(new client_dynamodb_1.ScanCommand(params));
        console.log({ onlineUsers });
        callback(null, {
            statusCode: 200,
            body: JSON.stringify(onlineUsers),
        });
    }
    catch (error) {
        console.log(error);
        callback(null, {
            statusCode: 500,
            body: JSON.stringify(error),
        });
    }
};
exports.getUsersHandler = getUsersHandler;
