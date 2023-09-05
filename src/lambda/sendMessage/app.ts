import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const dynamo = DynamoDBDocumentClient.from(client);

import { PostToConnectionCommand, ApiGatewayManagementApiClient } from '@aws-sdk/client-apigatewaymanagementapi';

export const sendMessageHandler = async (event: any, context: any, callback: any) => {
    try {
        console.log({ event });
        // Retrieve connectionIds from the connections table
        // const params = {
        //     TableName: process.env.CONNECTIONS_TABLE_NAME,
        //     IndexName: 'cognitoid-index', // Name of the global secondary index
        //     KeyConditionExpression: 'cognitoid = :cognitoId',
        //     ExpressionAttributeValues: {
        //         ':cognitoId': cognitoId,
        //     },
        // };

        // try {
        //     const scanResponse = await dynamo.send(new ScanCommand(params));
        //     // Check if any items were found
        //     if (scanResponse.Items && scanResponse.Items.length > 0) {
        //         // Extract the connection ID from the first item (assuming unique cognito IDs)
        //         const connectionId = scanResponse.Items[0].connectionId;
        //         console.log('Connection ID:', connectionId);
        //     } else {
        //         console.log('No matching records found for the cognito ID:', cognitoId);
        //     }
        // } catch (error) {
        //     console.error('Error querying DynamoDB:', error);
        // }

        // // Get the API endpoint
        // const endpoint = event.requestContext.domainName + '/' + event.requestContext.stage;
        // console.log({ endpoint });

        // // Create an instance of the API Gateway Management API

        // const APIGWClient = new ApiGatewayManagementApiClient({
        //     region: 'eu-west-2',
        //     endpoint: event.requestContext.domainName + '/' + event.requestContext.stage,
        // });

        // // Send messages to each connectionId retrieved from the table
        // try {
        //     await APIGWClient.send(new PostToConnectionCommand({ ConnectionId: connectionId, Data: 'hello' }));
        // } catch (e: any) {
        //     // If the connection is stale, delete it from the table
        //     if (e.statusCode === 410) {
        //         console.log(`Found stale connection, deleting ${connectionId}`);
        //         await dynamo.send(
        //             new DeleteCommand({ TableName: process.env.CONNECTIONS_TABLE_NAME, Key: { connectionId } }),
        //         );
        //         throw e;
        //     }
        // }

        // Return a success response
        return { statusCode: 200, body: 'Data sent.' };
    } catch (error) {
        return { statusCode: 500, body: 'error sending message' };
    }
};
