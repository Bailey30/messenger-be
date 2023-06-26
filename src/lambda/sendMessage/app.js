"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageHandler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: 'eu-west-2' });
const dynamo = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const AWS = require('aws-sdk');
const sendMessageHandler = async (event, context, callback) => {
    // scan connectionstable for connectionIds
    const params = {
        TableName: process.env.CONNECTIONS_TABLE_NAME,
        ProjectionExpression: 'connectionId',
    };
    const scanResponse = await dynamo.send(new client_dynamodb_1.ScanCommand(params));
    const endpoint = event.requestContext.domainName + '/' + event.requestContext.stage;
    console.log({ endpoint });
    const apigwManagementApi = new AWS.ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: event.requestContext.domainName + '/' + event.requestContext.stage,
    });
    const postCalls = scanResponse?.Items?.map(async ({ connectionId }) => {
        try {
            await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: 'hello' }).promise();
        }
        catch (e) {
            if (e.statusCode === 410) {
                console.log(`Found stale connection, deleting ${connectionId}`);
                await dynamo.send(new lib_dynamodb_1.DeleteCommand({ TableName: process.env.CONNECTIONS_TABLE_NAME, Key: { connectionId } }));
                throw e;
            }
        }
    });
    try {
        postCalls && (await Promise.all(postCalls));
    }
    catch (e) {
        return { statusCode: 500, body: e.stack };
    }
    return { statusCode: 200, body: 'Data sent.' };
};
exports.sendMessageHandler = sendMessageHandler;
