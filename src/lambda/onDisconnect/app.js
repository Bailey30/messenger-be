"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectHandler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: 'eu-west-2' });
const dynamo = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const disconnectHandler = async (event) => {
    console.log('EVENT', event);
    console.info('EVENT\n' + JSON.stringify(event, null, 2));
    const params = {
        TableName: process.env.CONNECTIONS_TABLE_NAME,
        Key: {
            connectionId: event.requestContext.connectionId,
        },
    };
    try {
        // get cognitoid from connectionTable using connectionid
        const connection = await dynamo.send(new lib_dynamodb_1.GetCommand(params));
        console.log('connection', connection);
        const cognitoid = connection?.Item?.cognitoid;
        console.log('cognitoid', cognitoid);
        // change online status of user to offline
        const usersTableParams = {
            TableName: process.env.USERS_TABLE_NAME,
            Key: {
                cognitoid: { S: cognitoid },
            },
            UpdateExpression: 'set #onlineStatus = :status',
            ExpressionAttributeNames: {
                '#onlineStatus': 'onlineStatus',
            },
            ExpressionAttributeValues: {
                ':status': { S: 'offline' },
            },
            ReturnValues: 'ALL_NEW',
        };
        await dynamo.send(new client_dynamodb_1.UpdateItemCommand(usersTableParams));
        await dynamo.send(new lib_dynamodb_1.DeleteCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'websocket disconnected',
            }),
        };
        // callback(null, {
        //     statusCode: 201,
        //     body: JSON.stringify(event.body),
        // });
    }
    catch (err) {
        console.error(`Error deleting item fro, table: ${err}`);
        return {
            statusCode: 500,
            body: JSON.stringify(err.message),
        };
    }
};
exports.disconnectHandler = disconnectHandler;
