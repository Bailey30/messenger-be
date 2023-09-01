import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, BatchExecuteStatementCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const dynamo = DynamoDBDocumentClient.from(client);
export const disconnectHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('EVENT', event);
    console.info('EVENT\n' + JSON.stringify(event, null, 2));

    const params = {
        TableName: process.env.CONNECTIONS_TABLE_NAME,
        Key: {
            connectionId: event.requestContext.connectionId,

            
        },
    };

    try {
        // maybe make cognito id as primary key again so we can use condition expression in onconnect
        // get cognitoid from connectionTable using connectionid
        const connection = await dynamo.send(new GetCommand(params));
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

        await dynamo.send(new UpdateItemCommand(usersTableParams));

        await dynamo.send(new DeleteCommand(params));

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
    } catch (err: any) {
        console.error(`Error deleting item fro, table: ${err}`);

        return {
            statusCode: 500,
            body: JSON.stringify(err.message),
        };
    }
};
