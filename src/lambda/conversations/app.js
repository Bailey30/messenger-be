"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversations = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: 'eu-west-2' });
const dynamo = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const logger_1 = require("@aws-lambda-powertools/logger");
const logger = new logger_1.Logger();
async function getConversationIds(cognitoId) {
    const scanParams = {
        TableName: process.env.CONVERSATIONS_TABLE_NAME,
        FilterExpression: 'contains(participants, :cognitoId) ',
        ExpressionAttributeValues: {
            ':cognitoId': cognitoId,
        },
        ProjectionExpression: 'conversationId',
    };
    const existingConversation = await dynamo.send(new lib_dynamodb_1.ScanCommand(scanParams));
    console.log({ existingConversation });
    // Check if the Items array exists and has at least one item
    if (existingConversation.Items && existingConversation.Items.length > 0) {
        return existingConversation.Items;
    }
    else {
        // Return null or an appropriate value if no items are found
        return null;
    }
}
async function getMessages(conversations) {
    const recentMessages = [];
    try {
        for (const conversation of conversations) {
            // Create parameters for the QueryCommand
            const params = {
                TableName: process.env.MESSAGES_TABLE_NAME,
                KeyConditionExpression: 'conversationId = :conversationId',
                ExpressionAttributeValues: {
                    ':conversationId': conversation.conversationId,
                },
                // Order by the sort key (messageTimestamp) in descending order and limit to 1
                ScanIndexForward: false,
                Limit: 1,
            };
            // Execute the QueryCommand
            const data = await dynamo.send(new lib_dynamodb_1.QueryCommand(params));
            console.log('[Query response]', data);
            if (data.Items && data.Items.length > 0) {
                recentMessages.push(data.Items[0]);
            }
        }
        console.log('[recentMessages]', recentMessages);
        return recentMessages;
    }
    catch (error) {
        console.error('Error querying DynamoDB:', error);
        throw new Error('Could not retrieve messages');
    }
}
const conversations = async (event, context, callback) => {
    try {
        console.log('[Event]', event);
        logger.info(`[Event]: ${event}`);
        if (!event.body) {
            return callback(null, {
                statusCode: 500,
                body: JSON.stringify({ error: 'Request body required' }),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }
        console.log('[Context]', JSON.stringify(context));
        const body = JSON.parse(event.body);
        const userCognitoId = body.userCognitoId;
        const conversationIds = await getConversationIds(userCognitoId);
        console.log('[ConversationIds]', conversationIds);
        let messages = [];
        if (conversationIds && conversationIds.length > 0) {
            messages = await getMessages(conversationIds);
        }
        console.log('[Messages]', messages);
        callback(null, {
            statusCode: 200,
            body: JSON.stringify({ messages }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }
    catch (err) {
        console.log('error in conversation function', err);
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
exports.conversations = conversations;
