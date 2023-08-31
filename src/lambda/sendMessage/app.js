import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
const client = new DynamoDBClient({ region: 'eu-west-2' });
const dynamo = DynamoDBDocumentClient.from(client);
const AWS = require('aws-sdk');
export const sendMessageHandler = async (event, context, callback) => {
    // scan connectionstable for connectionIds
    const params = {
        TableName: process.env.CONNECTIONS_TABLE_NAME,
        ProjectionExpression: 'connectionId',
    };
    const scanResponse = await dynamo.send(new ScanCommand(params));
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
                await dynamo.send(new DeleteCommand({ TableName: process.env.CONNECTIONS_TABLE_NAME, Key: { connectionId } }));
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
