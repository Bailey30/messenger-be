import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const dynamo = DynamoDBDocumentClient.from(client);

const AWS = require('aws-sdk');
export const sendMessageHandler = async (event: any, context: any, callback: any) => {
    // Retrieve connectionIds from the connections table
    const params = {
        TableName: process.env.CONNECTIONS_TABLE_NAME,
        ProjectionExpression: 'connectionId',
    };
    const scanResponse = await dynamo.send(new ScanCommand(params));

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
    });
    try {
        // Wait for all post calls to complete
        postCalls && (await Promise.all(postCalls));
    } catch (e: any) {
        // Return an error response if there was an exception
        return { statusCode: 500, body: e.stack };
    }
    // Return a success response
    return { statusCode: 200, body: 'Data sent.' };
};