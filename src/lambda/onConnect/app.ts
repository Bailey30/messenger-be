// import { websocketBroadcaster } from '../../utils/nodejs/node_modules/broadcastWebsocket';
// const websocketBroadcaster = require("broadcastWebsocket")
//@ts-ignore
import { websocketBroadcaster } from '/opt/nodejs/broadcastWebsocket';

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, BatchExecuteStatementCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    ScanCommand,
    PutCommand,
    GetCommand,
    DeleteCommand,
    QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { PostToConnectionCommand, ApiGatewayManagementApiClient } from '@aws-sdk/client-apigatewaymanagementapi';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const dynamo = DynamoDBDocumentClient.from(client);

const CognitoClient = new CognitoIdentityProviderClient({ region: 'eu-west-2' });
export const connectHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log('EVENT', event);
    console.info('EVENT\n' + JSON.stringify(event, null, 2));
    const accessToken = event.queryStringParameters?.token;

    try {
        //gets details of the user using the provided access token
        const user: any = await CognitoClient.send(
            new GetUserCommand({
                AccessToken: accessToken,
            }),
        );

        console.log({ user });
        console.log({ user: user?.UserAttributes });

        // gets the cognito id also know as 'sub'
        const cognitoId = user?.UserAttributes.find((attr: { Name: string }) => attr.Name === 'sub').Value;
        console.log({ cognitoId });

        const username = user?.UserAttributes.find((attr: { Name: string }) => attr.Name === 'name').Value;

        // check if the user is already in the connections database
        const getUserParams = {
            TableName: process.env.CONNECTIONS_TABLE_NAME,
            IndexName: 'cognitoid-index',
            KeyConditionExpression: 'cognitoid = :cognitoid',
            ExpressionAttributeValues: {
                ':cognitoid': cognitoId, // Replace with your actual value
            },
        };

        const connectedUser = await dynamo.send(new QueryCommand(getUserParams));
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
        await dynamo.send(new PutCommand(params));

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
        await dynamo.send(new UpdateItemCommand(usersTableParams));

        // send websocket to everyone that has connected
        const getConnectionsParams = {
            TableName: process.env.CONNECTIONS_TABLE_NAME,
            ProjectionExpression: 'connectionId',
        };
        // scan db for all connections
        const scanResponse = await dynamo.send(new ScanCommand(getConnectionsParams));

        try {
            const endpoint = 'https://' + event.requestContext.domainName + '/' + event.requestContext.stage;
            const APIGWClient = new ApiGatewayManagementApiClient({ region: 'eu-west-2', endpoint });

            const broadCaster = new websocketBroadcaster(
                process.env.CONNECTIONS_TABLE_NAME,
                APIGWClient,
                dynamo,
                ScanCommand,
                PostToConnectionCommand,
                DeleteCommand,
                username,
                cognitoId,
                event.requestContext.connectionId,
            );

            try {
                // await Promise.all(sendConnectedMessageToEveryone);
                // await sendConnectedMessageToEveryone();
                await broadCaster.broadcast('userConnected');
            } catch (error) {
                console.log('[error] error broading casting login:', error);
            }
        } catch (error) {
            console.log('[error] error broading casting login:', error);
        }
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'websocket connected',
            }),
        };
    } catch (err: any) {
        console.error(`Error adding item to table: ${err}`);

        return {
            statusCode: 500,
            body: JSON.stringify(err.message),
        };

        throw new Error(`Error adding item to table: ${err}`);
    }
};
