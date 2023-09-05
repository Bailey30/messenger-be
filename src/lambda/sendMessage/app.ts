import { AttributeValue, DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const dynamo = DynamoDBDocumentClient.from(client);

import { PostToConnectionCommand, ApiGatewayManagementApiClient } from '@aws-sdk/client-apigatewaymanagementapi';
import { APIGatewayProxyEvent } from 'aws-lambda';

const getConnectionId = async (cognitoId: string): Promise<string | null> => {
    // Retrieve connectionIds from the connections table
    console.log('getting connectionId');
    try {
        const params = {
            TableName: process.env.CONNECTIONS_TABLE_NAME,
            IndexName: 'cognitoid-index', // Name of the global secondary index
            KeyConditionExpression: 'cognitoid = :cognitoId',
            ExpressionAttributeValues: {
                ':cognitoId': { S: cognitoId }, // Convert to DynamoDB AttributeValue format
            },
        };
        const scanResponse = await dynamo.send(new ScanCommand(params));
        console.log({ scanResponse });
        // Check if any items were found
        if (scanResponse.Items && scanResponse.Items.length > 0 && scanResponse.Items[0].connectionId.S) {
            const connectionId = scanResponse.Items[0].connectionId.S;
            console.log('Connection ID:', connectionId);
            return connectionId;
        } else {
            console.log('No matching records found for the cognito ID:', cognitoId);
            return null;
        }
    } catch (error: any) {
        console.error('Error querying DynamoDB:', error);
        throw new Error(error);
    }
};

const addMessageToDB = async (
    conversationId: string,
    createdAt: string,
    senderId: string,
    receiverId: string,
    content: string,
) => {
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

        await dynamo.send(new PutCommand(putParams));
        return;
    } catch (error: any) {
        console.error('error adding message to db:', error);
        throw new Error(error);
    }
};

export const sendMessageHandler = async (event: any) => {
    try {
        console.log({ event });
        console.log(event.body);
        // const { content, conversationId, createdAt, senderId, receiverId } = JSON.parse(event.body.data);
        const data = JSON.parse(event.body.data);
        console.log({ data });
        const content = data.content;
        const conversationId = data.conversationId;
        const createdAt = data.createdAt;
        const senderId = data.senderId;
        const receiverId = data.receiverId;

        const connectionId = await getConnectionId(receiverId);
        await addMessageToDB(conversationId, createdAt, senderId, receiverId, content);

        const APIGWClient = new ApiGatewayManagementApiClient({
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
                await APIGWClient.send(
                    new PostToConnectionCommand({ ConnectionId: connectionId, Data: JSON.stringify(messageData) }),
                );
                console.log('message sent to:', connectionId, messageData);
            } catch (e: any) {
                // If the connection is stale, delete it from the table
                if (e.statusCode === 410) {
                    console.log(`Found stale connection, deleting ${connectionId}`);
                    await dynamo.send(
                        new DeleteCommand({ TableName: process.env.CONNECTIONS_TABLE_NAME, Key: { connectionId } }),
                    );
                    throw e;
                }
            }
        } else {
            throw new Error('no connection id, cannot post to connection');
        }

        return { statusCode: 200, body: 'Data sent.' };
    } catch (error) {
        return { statusCode: 500, body: 'error sending message' };
    }
};
