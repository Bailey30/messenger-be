import { DynamoDBClient, BatchExecuteStatementCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'eu-west-2' });

export const getUsersHandler = (event: any) => {
    //
};
