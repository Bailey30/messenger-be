import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient({
    apiVersion: '2012-08-10',
    region: 'ue-west-2',
    httpOptions: {
        timeout: 5000,
    },
    maxRetries: 3,
});

export const postConfirmationHandler = async (event: any, context: any, callback: any) => {
    console.log('EVENT', event);
    console.info('EVENT info\n' + JSON.stringify(event, null, 2));

    context.callbackWaitsForEmptyEventLoop = false;
    // By default, if callbackWaitsForEmptyEventLoop is true, the Lambda function will wait for the event loop to be empty before returning the response to the caller. Setting it to false allows the function to return immediately, without waiting for the event loop to be empty. This can be useful in scenarios where the function performs async operations that do not need to complete before the function returns, such as sending an email or updating a database.

    const params = {
        TableName: process.env.USERS_TABLE_NAME,
        Item: {
            cognitoid: event.request.userAttributes.sub,
            username: event.request.userAttributes.username,
            email: event.request.userAttributes.email,
        },
        ConditionExpression: 'attribute_not_exists(cognitoid)',
    };

    try {
        await dynamodb.put(params).promise();
    } catch (err) {
        console.error(`Error adding item to table: ${err}`);
        throw new Error(`Error adding item to table: ${err}`);
    }

    return event;
};
