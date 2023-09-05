"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageHandler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: 'eu-west-2' });
const dynamo = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const AWS = require('aws-sdk');
const sendMessageHandler = async (event, context, callback) => {
    console.log({ event });
    // Retrieve connectionIds from the connections table
    const params = {
        TableName: process.env.CONNECTIONS_TABLE_NAME,
        ProjectionExpression: 'connectionId',
    };
    const scanResponse = await dynamo.send(new client_dynamodb_1.ScanCommand(params));
    // Get the API endpoint
    const endpoint = event.requestContext.domainName + '/' + event.requestContext.stage;
    console.log({ endpoint });
    // Create an instance of the API Gateway Management API
    const apigwManagementApi = new AWS.ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: event.requestContext.domainName + '/' + event.requestContext.stage,
    });
    // Send messages to each connectionId retrieved from the table
    const postCalls = scanResponse?.Items?.map(async ({ connectionId }) => {
        try {
            await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: 'hello' }).promise();
        }
        catch (e) {
            // If the connection is stale, delete it from the table
            if (e.statusCode === 410) {
                console.log(`Found stale connection, deleting ${connectionId}`);
                await dynamo.send(new lib_dynamodb_1.DeleteCommand({ TableName: process.env.CONNECTIONS_TABLE_NAME, Key: { connectionId } }));
                throw e;
            }
        }
    });
    try {
        // Wait for all post calls to complete
        postCalls && (await Promise.all(postCalls));
    }
    catch (e) {
        // Return an error response if there was an exception
        return { statusCode: 500, body: e.stack };
    }
    // Return a success response
    return { statusCode: 200, body: 'Data sent.' };
};
exports.sendMessageHandler = sendMessageHandler;
