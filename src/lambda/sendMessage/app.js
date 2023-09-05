"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageHandler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: 'eu-west-2' });
const dynamo = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const client_apigatewaymanagementapi_1 = require("@aws-sdk/client-apigatewaymanagementapi");
const getConnectionId = async (cognitoId) => {
    // Retrieve connectionIds from the connections table
    console.log('getting connectionId');
    try {
        const params = {
            TableName: process.env.CONNECTIONS_TABLE_NAME,
            IndexName: 'cognitoid-index',
            KeyConditionExpression: 'cognitoid = :cognitoId',
            ExpressionAttributeValues: {
                ':cognitoId': { S: cognitoId }, // Convert to DynamoDB AttributeValue format
            },
        };
        const scanResponse = await dynamo.send(new client_dynamodb_1.QueryCommand(params));
        console.log({ scanResponse });
        // Check if any items were found
        if (scanResponse.Items && scanResponse.Items.length > 0 && scanResponse.Items[0].connectionId.S) {
            const connectionId = scanResponse.Items[0].connectionId.S;
            console.log('Connection ID:', connectionId);
            return connectionId;
        }
        else {
            console.log('No matching records found for the cognito ID:', cognitoId);
            return null;
        }
    }
    catch (error) {
        console.error('Error querying DynamoDB:', error);
        throw new Error(error);
    }
};
const addMessageToDB = async (conversationId, createdAt, senderId, receiverId, content) => {
    try {
        const putParams = {
            TableName: process.env.MESSAGES_TABLE_NAME,
            Item: {
                conversationId: conversationId,
                timestamp: createdAt,
                senderId: senderId,
                receiverId: receiverId,
                content: content,
            },
        };
        await dynamo.send(new lib_dynamodb_1.PutCommand(putParams));
        return;
    }
    catch (error) {
        console.error('error adding message to db:', error);
        throw new Error(error);
    }
};
const sendMessageHandler = async (event) => {
    try {
        console.log({ event });
        console.log(event.body);
        const body = JSON.parse(event.body);
        const { content, conversationId, createdAt, senderId, receiverId } = body.data;
        // console.log({ data });
        // const content = data.content;
        // const conversationId = data.conversationId;
        // const createdAt = data.createdAt;
        // const senderId = data.senderId;
        // const receiverId = data.receiverId;
        const connectionId = await getConnectionId(receiverId);
        await addMessageToDB(conversationId, createdAt, senderId, receiverId, content);
        const APIGWClient = new client_apigatewaymanagementapi_1.ApiGatewayManagementApiClient({
            region: 'eu-west-2',
            endpoint: event.requestContext.domainName + '/' + event.requestContext.stage,
        });
        const messageData = {
            type: 'messageReceived',
            content,
            conversationId,
            createdAt,
            senderId,
            receiverId,
        };
        if (connectionId) {
            try {
                await APIGWClient.send(new client_apigatewaymanagementapi_1.PostToConnectionCommand({ ConnectionId: connectionId, Data: JSON.stringify(messageData) }));
                console.log('message sent to:', connectionId, messageData);
            }
            catch (e) {
                // If the connection is stale, delete it from the table
                if (e.statusCode === 410) {
                    console.log(`Found stale connection, deleting ${connectionId}`);
                    await dynamo.send(new lib_dynamodb_1.DeleteCommand({ TableName: process.env.CONNECTIONS_TABLE_NAME, Key: { connectionId } }));
                    throw e;
                }
            }
        }
        else {
            throw new Error('no connection id, cannot post to connection');
        }
        return { statusCode: 200, body: 'Data sent.' };
    }
    catch (error) {
        return { statusCode: 500, body: 'error sending message' };
    }
};
exports.sendMessageHandler = sendMessageHandler;
