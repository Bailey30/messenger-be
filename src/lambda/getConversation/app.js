"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversation = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: 'eu-west-2' });
const dynamo = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const uuid_1 = require("uuid");
const conversationTableName = process.env.CONVERSATION_TABLE_NAME;
const scanForConversation = async (userCognitoId, selectedUserCognitoId) => {
    const scanParams = {
        TableName: conversationTableName,
        filterExpression: 'contains(participants, :userId) AND contains(participants, :selectedUserId)',
        ExpressionAttributeValues: {
            ':userId': { S: userCognitoId },
            ':selectedUserId': {
                S: selectedUserCognitoId,
            },
        },
        ProjectionExpression: 'conversationId',
    };
    const existingConversation = await dynamo.send(new client_dynamodb_1.ScanCommand(scanParams));
    console.log({ existingConversation });
    // Check if the Items array exists and has at least one item
    if (existingConversation.Items && existingConversation.Items.length > 0) {
        // Return the first item from the array
        return existingConversation.Items[0];
    }
    else {
        // Return null or an appropriate value if no items are found
        return null;
    }
};
const createConversation = async (userCognitoId, selectedUserCognitoId, newConversationId) => {
    const putParams = {
        TableName: conversationTableName,
        Item: {
            conversationId: newConversationId,
            participants: [userCognitoId, selectedUserCognitoId],
        },
    };
    await dynamo.send(new lib_dynamodb_1.PutCommand(putParams));
};
// lambda handler
const getConversation = async (event, context, callback) => {
    try {
        console.log(event);
        const body = JSON.parse(event.body);
        const userCognitoId = body.userCognitoId;
        const selectedUserCognitoId = body.selectedUserCognitoId;
        let conversationId;
        // take cognitoid of both users and search database for conversation that has those ids
        const existingConversation = await scanForConversation(userCognitoId, selectedUserCognitoId);
        // if conversation doesnt exists, create new conversation
        if (existingConversation) {
            conversationId = existingConversation;
        }
        else {
            const newConversationId = (0, uuid_1.v4)();
            await createConversation(userCognitoId, selectedUserCognitoId, newConversationId);
            conversationId = newConversationId;
            console.log('new conversation created', newConversationId);
        }
        callback(null, {
            statusCode: 200,
            body: JSON.stringify({ conversationId }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }
    catch (error) {
        console.error('Error:', error);
        callback('Internal Server Error', {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        });
    }
};
exports.getConversation = getConversation;
