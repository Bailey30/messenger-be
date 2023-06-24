"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectHandler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: 'eu-west-2' });
const dynamo = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const connectHandler = async (event) => {
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
        await dynamo.send(new lib_dynamodb_1.PutCommand(params));
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
    }
    catch (err) {
        console.error(`Error adding item to table: ${err}`);
        return {
            statusCode: 500,
            body: JSON.stringify(err.message),
        };
        throw new Error(`Error adding item to table: ${err}`);
    }
};
exports.connectHandler = connectHandler;
