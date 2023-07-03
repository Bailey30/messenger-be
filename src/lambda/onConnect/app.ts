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
        const user: any = await CognitoClient.send(
            new GetUserCommand({
                AccessToken: accessToken,
            }),
        );

        console.log({ user });
        console.log({ user: user?.UserAttributes });

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

        await dynamo.send(new PutCommand(params));

        // set onlineStatus to online in usersTable

        const usersTableParams = {
            TableName: process.env.USERS_TABLE_NAME,
            Key: {
                cognitoid: cognitoId,
            },
            UpdateExpression: 'set onlineStatus = :status',
            ExpressionAttributeValues: {
                ':status': { S: 'online' },
            },
            ReturnValues: 'ALL_NEW',
        };

        await dynamo.send(new UpdateItemCommand(usersTableParams));

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
