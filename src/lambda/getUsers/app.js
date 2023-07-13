"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsersHandler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: 'eu-west-2' });
const dynamo = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const getUsersHandler = async (event, context, callback) => {
    console.log('EVENT', event);
    try {
        const params = {
            TableName: process.env.USERS_TABLE_NAME,
            ExpressionAttributeNames: { '#onlineStatus': 'onlineStatus' },
            ExpressionAttributeValues: { ':onlineStatus': { S: 'online' } },
            FilterExpression: '#onlineStatus = :onlineStatus',
        };
        const onlineUsers = await dynamo.send(new client_dynamodb_1.ScanCommand(params));
        console.log({ onlineUsers });
        const formattedUsers = onlineUsers?.Items?.map((user) => {
            return {
                cognitoid: user.cognitoid.S,
                onlineStatus: user.onlineStatus.S,
                username: user.username.S,
            };
        });
        console.log({ formattedUsers });
        callback(null, {
            statusCode: 200,
            body: JSON.stringify(formattedUsers),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
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
