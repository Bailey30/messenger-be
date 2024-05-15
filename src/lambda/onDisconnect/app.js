"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectHandler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_apigatewaymanagementapi_1 = require("@aws-sdk/client-apigatewaymanagementapi");
//@ts-ignore
const broadcastWebsocket_1 = require("/opt/nodejs/broadcastWebsocket");
const client = new client_dynamodb_1.DynamoDBClient({ region: 'eu-west-2' });
const dynamo = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const disconnectHandler = async (event) => {
    console.log('EVENT', event);
    console.info('EVENT\n' + JSON.stringify(event, null, 2));
    const params = {
        TableName: process.env.CONNECTIONS_TABLE_NAME,
        Key: {
            connectionId: event.requestContext.connectionId,
        },
    };
    try {
        // get the users cognitoId that can be broadcast to all active users
        const getUserParams = {
            TableName: process.env.CONNECTIONS_TABLE_NAME,
            KeyConditionExpression: 'connectionId = :connectionId',
            ExpressionAttributeValues: {
                ':connectionId': event.requestContext.connectionId,
            },
            ConsistentRead: true,
        };
        const connectedUser = await dynamo.send(new lib_dynamodb_1.QueryCommand(getUserParams));
        console.log('query result', connectedUser);
        console.log('connectedUser', connectedUser.Items ? connectedUser.Items[0] : 'no connected user found');
        const cognitoid = connectedUser.Items && connectedUser.Items[0].cognitoid;
        // maybe make cognito id as primary key again so we can use condition expression in onconnect
        // get cognitoid from connectionTable using connectionid
        const connection = await dynamo.send(new lib_dynamodb_1.GetCommand(params));
        console.log('connection', connection);
        // const cognitoid = connection?.Item?.cognitoid;
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
        await dynamo.send(new client_dynamodb_1.UpdateItemCommand(usersTableParams));
        // delete connectionId from connections table
        await dynamo.send(new lib_dynamodb_1.DeleteCommand(params));
        // broadcast disconnect event to active users
        const endpoint = 'https://' + event.requestContext.domainName + '/' + event.requestContext.stage;
        const APIGWClient = new client_apigatewaymanagementapi_1.ApiGatewayManagementApiClient({ region: 'eu-west-2', endpoint });
        const broadCaster = new broadcastWebsocket_1.websocketBroadcaster(process.env.CONNECTIONS_TABLE_NAME, APIGWClient, dynamo, lib_dynamodb_1.ScanCommand, client_apigatewaymanagementapi_1.PostToConnectionCommand, lib_dynamodb_1.DeleteCommand, '', cognitoid, event.requestContext.connectionId ?? '');
        broadCaster.broadcast('userDisconnected');
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
    }
    catch (err) {
        console.error(`Error deleting item fro, table: ${err}`);
        return {
            statusCode: 500,
            body: JSON.stringify(err.message),
        };
    }
};
exports.disconnectHandler = disconnectHandler;
