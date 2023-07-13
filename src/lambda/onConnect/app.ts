import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, BatchExecuteStatementCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

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

        const params = {
            TableName: process.env.CONNECTIONS_TABLE_NAME,
            Item: {
                connectionId: event.requestContext.connectionId,
                cognitoid: cognitoId,
            },
            ConditionExpression: 'attribute_not_exists(cognitoid)',
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
