import { DynamoDBClient, BatchExecuteStatementCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const dynamo = DynamoDBDocumentClient.from(client);
export const getUsersHandler = async (event: any, context: any, callback: any) => {
    console.log('EVENT', event);

    try {
        const params = {
            TableName: process.env.USERS_TABLE_NAME,
            ExpressionAttributeNames: { '#onlineStatus': 'onlineStatus' },
            ExpressionAttributeValues: { ':onlineStatus': { S: 'online' } },
            FilterExpression: '#onlineStatus = :onlineStatus',
        };

        const onlineUsers = await dynamo.send(new ScanCommand(params));
        console.log({ onlineUsers });

        callback(null, {
            statusCode: 200,
            body: JSON.stringify(onlineUsers),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    } catch (error) {
        console.log(error);
        callback(null, {
            statusCode: 500,
            body: JSON.stringify(error),
        });
    }
};
