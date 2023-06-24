import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, BatchExecuteStatementCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const dynamo = DynamoDBDocumentClient.from(client);
export const connectHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('EVENT', event);
    console.info('EVENT\n' + JSON.stringify(event, null, 2));

    const params = {
        TableName: process.env.CONNECTIONS_TABLE_NAME,
        Item: {
            cognitoid: 1,
            connectionId: event.requestContext.connectionId,
        },
        ConditionExpression: 'attribute_not_exists(cognitoid)',
    };

    try {
        await dynamo.send(new PutCommand(params));
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'websocket connected',
            }),
        };
        // callback(null, {
        //     statusCode: 201,
        //     body: JSON.stringify(event.body),
        // });
    } catch (err: any) {
        console.error(`Error adding item to table: ${err}`);

        return {
            statusCode: 500,
            body: JSON.stringify(err.message),
        };

        throw new Error(`Error adding item to table: ${err}`);
    }
};
