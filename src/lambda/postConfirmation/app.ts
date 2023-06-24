import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// const AWS = require('aws-sdk');
import { DynamoDBClient, BatchExecuteStatementCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const dynamo = DynamoDBDocumentClient.from(client);
export const postConfirmationHandler = async (event: any, context: any, callback: any) => {
    console.log('EVENT', event);
    console.info('EVENT info\n' + JSON.stringify(event, null, 2));

    context.callbackWaitsForEmptyEventLoop = false;
    // By default, if callbackWaitsForEmptyEventLoop is true, the Lambda function will wait for the event loop to be empty before returning the response to the caller. Setting it to false allows the function to return immediately, without waiting for the event loop to be empty. This can be useful in scenarios where the function performs async operations that do not need to complete before the function returns, such as sending an email or updating a database.

    const params = {
        TableName: process.env.USERS_TABLE_NAME,
        Item: {
            cognitoid: event.request.userAttributes.sub,
            username: event.request.userAttributes.name,
            email: event.request.userAttributes.email,
        },
        ConditionExpression: 'attribute_not_exists(cognitoid)',
    };

    try {
        await dynamo.send(new PutCommand(params));

        // callback(null, {
        //     statusCode: 201,
        //     body: JSON.stringify(event.body),
        // });
    } catch (err: any) {
        console.error(`Error adding item to table: ${err}`);
        callback(null, {
            statusCode: 500,
            body: JSON.stringify(err.message),
        });
        throw new Error(`Error adding item to table: ${err}`);
    }

    return event;
};
