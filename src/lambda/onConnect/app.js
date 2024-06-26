"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectHandler = void 0;
// import { websocketBroadcaster } from '../../utils/nodejs/node_modules/broadcastWebsocket';
// const websocketBroadcaster = require("broadcastWebsocket")
//@ts-ignore
const broadcastWebsocket_1 = require("/opt/nodejs/broadcastWebsocket");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const client_apigatewaymanagementapi_1 = require("@aws-sdk/client-apigatewaymanagementapi");
const client = new client_dynamodb_1.DynamoDBClient({ region: 'eu-west-2' });
const dynamo = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const CognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({ region: 'eu-west-2' });
const connectHandler = async (event) => {
    console.log('EVENT', event);
    console.info('EVENT\n' + JSON.stringify(event, null, 2));
    const accessToken = event.queryStringParameters?.token;
    try {
        //gets details of the user using the provided access token
        const user = await CognitoClient.send(new client_cognito_identity_provider_1.GetUserCommand({
            AccessToken: accessToken,
        }));
        console.log({ user });
        console.log({ user: user?.UserAttributes });
        // gets the cognito id also know as 'sub'
        const cognitoId = user?.UserAttributes.find((attr) => attr.Name === 'sub').Value;
        console.log({ cognitoId });
        const username = user?.UserAttributes.find((attr) => attr.Name === 'name').Value;
        // check if the user is already in the connections database
        const getUserParams = {
            TableName: process.env.CONNECTIONS_TABLE_NAME,
            IndexName: 'cognitoid-index',
            KeyConditionExpression: 'cognitoid = :cognitoid',
            ExpressionAttributeValues: {
                ':cognitoid': cognitoId, // Replace with your actual value
            },
        };
        const connectedUser = await dynamo.send(new lib_dynamodb_1.QueryCommand(getUserParams));
        console.log({ connectedUser });
        if (connectedUser.Items && connectedUser.Items.length > 0) {
            console.log('User already connected and in the database');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'User already connected to websocket',
                }),
            };
        }
        // put the user in the database if they are not already there
        const params = {
            TableName: process.env.CONNECTIONS_TABLE_NAME,
            Item: {
                connectionId: event.requestContext.connectionId,
                cognitoid: cognitoId,
            },
            ConditionExpression: 'attribute_not_exists(cognitoid)', // this does nothing because cognito id is not the primary key
        };
        // adds connectionId and cognitoId to the connections table
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
        // updates onlineStatus in usersTable
        await dynamo.send(new client_dynamodb_1.UpdateItemCommand(usersTableParams));
        // send websocket to everyone that has connected
        const getConnectionsParams = {
            TableName: process.env.CONNECTIONS_TABLE_NAME,
            ProjectionExpression: 'connectionId',
        };
        // scan db for all connections
        const scanResponse = await dynamo.send(new lib_dynamodb_1.ScanCommand(getConnectionsParams));
        try {
            const endpoint = 'https://' + event.requestContext.domainName + '/' + event.requestContext.stage;
            const APIGWClient = new client_apigatewaymanagementapi_1.ApiGatewayManagementApiClient({ region: 'eu-west-2', endpoint });
            const broadCaster = new broadcastWebsocket_1.websocketBroadcaster(process.env.CONNECTIONS_TABLE_NAME, APIGWClient, dynamo, lib_dynamodb_1.ScanCommand, client_apigatewaymanagementapi_1.PostToConnectionCommand, lib_dynamodb_1.DeleteCommand, username, cognitoId, event.requestContext.connectionId);
            try {
                // await Promise.all(sendConnectedMessageToEveryone);
                // await sendConnectedMessageToEveryone();
                await broadCaster.broadcast('userConnected');
            }
            catch (error) {
                console.log('[error] error broading casting login:', error);
            }
        }
        catch (error) {
            console.log('[error] error broading casting login:', error);
        }
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'websocket connected',
            }),
        };
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
