"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectHandler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const client = new client_dynamodb_1.DynamoDBClient({ region: 'eu-west-2' });
const dynamo = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const CognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({ region: 'eu-west-2' });
const connectHandler = async (event) => {
    console.log('EVENT', event);
    console.info('EVENT\n' + JSON.stringify(event, null, 2));
    const accessToken = event.queryStringParameters?.token;
    try {
        const user = await CognitoClient.send(new client_cognito_identity_provider_1.GetUserCommand({
            AccessToken: accessToken,
        }));
        console.log({ user });
        console.log({ user: user?.UserAttributes });
        const cognitoId = user?.UserAttributes.find((attr) => attr.Name === 'sub').Value;
        console.log({ cognitoId });
        const params = {
            TableName: process.env.CONNECTIONS_TABLE_NAME,
            Item: {
                connectionId: event.requestContext.connectionId,
                cognitoid: cognitoId,
            },
            ConditionExpression: 'attribute_not_exists(cognitoid)',
        };
        await dynamo.send(new lib_dynamodb_1.PutCommand(params));
        // set onlineStatus to online in usersTable
        const usersTableParams = {
            TableName: process.env.USERS_TABLE_NAME,
            Key: {
                cognitoid: { S: cognitoId },
            },
            UpdateExpression: 'set #onlineStatus = :status',
            ExpressionAttributeNames: {
                '#onlineStatus': 'onlineStatus',
            },
            ExpressionAttributeValues: {
                ':status': { S: 'online' },
            },
            ReturnValues: 'ALL_NEW',
        };
        await dynamo.send(new client_dynamodb_1.UpdateItemCommand(usersTableParams));
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
