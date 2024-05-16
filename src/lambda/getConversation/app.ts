import { AttributeValue, DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const dynamo = DynamoDBDocumentClient.from(client);

import { v4 as uuidv4 } from 'uuid';

// get an existing conversation between two people and return the conversationId
const scanForConversation = async (userCognitoId: string, selectedUserCognitoId: string) => {
    const scanParams = {
        TableName: process.env.CONVERSATIONS_TABLE_NAME,
        FilterExpression: 'contains(participants, :userId) AND contains(participants, :selectedUserId)',
        ExpressionAttributeValues: {
            ':userId': { S: userCognitoId },
            ':selectedUserId': {
                S: selectedUserCognitoId,
            },
        },
        ProjectionExpression: 'conversationId',
    };

    const existingConversation = await dynamo.send(new ScanCommand(scanParams));
    console.log({ existingConversation });

    // Check if the Items array exists and has at least one item
    if (existingConversation.Items && existingConversation.Items.length > 0) {
        // Return the first item from the array
        return existingConversation.Items[0].conversationId.S;
    } else {
        // Return null or an appropriate value if no items are found
        return null;
    }
};

// create a conversation if one doesn't exist
const createConversation = async (userCognitoId: string, selectedUserCognitoId: string, newConversationId: string) => {
    const putParams = {
        TableName: process.env.CONVERSATIONS_TABLE_NAME,
        Item: {
            conversationId: newConversationId,
            participants: [userCognitoId, selectedUserCognitoId],
        },
    };

    await dynamo.send(new PutCommand(putParams));
};

// get messages from an existing conversation
const getMessages = async (conversationId: string) => {
    const messages = await dynamo.send(
        new QueryCommand({
            TableName: process.env.MESSAGES_TABLE_NAME,
            KeyConditionExpression: 'conversationId = :id',
            ExpressionAttributeValues: {
                ':id': conversationId,
            },
        }),
    );

    console.log({ messages });
    console.log('messages.Items', messages.Items);

    return messages.Items;
};

// lambda handler
export const getConversation = async (event: any, context: any, callback: any) => {
    try {
        console.log(event);
        const body = JSON.parse(event.body);

        const userCognitoId = body.userCognitoId;
        const selectedUserCognitoId = body.selectedUserCognitoId;
        let conversationId;

        // take cognitoid of both users and search database for conversation that has those ids
        const existingConversation = await scanForConversation(userCognitoId, selectedUserCognitoId);

        let messages: Record<string, any>[] | undefined = [];

        if (existingConversation) {
            // if conversation exists, get the conversationId and use it to get any messages from that conversation
            console.log('Conversation exists:', existingConversation);
            conversationId = existingConversation;
            messages = await getMessages(existingConversation);
        } else {
            // if conversation doesnt exists, create new conversation
            const newConversationId = uuidv4();
            await createConversation(userCognitoId, selectedUserCognitoId, newConversationId);
            conversationId = newConversationId;
            console.log('new conversation created', newConversationId);
        }

        callback(null, {
            statusCode: 200,
            body: JSON.stringify({ conversationId, messages }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    } catch (error) {
        console.error('Error:', error);
        callback('Internal Server Error', {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }
};
