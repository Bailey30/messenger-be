import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const dynamo = DynamoDBDocumentClient.from(client);

export const getConversation = async (event: any, context: any, callback: any) => {
    // take cognitoid of both users and search database for conversation that has those ids

    // if conversation doesnt exists, create new conversation


}