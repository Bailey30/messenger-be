"use strict";
// async function websocketBroadcaster(
//     connectionsTableName: string,
//     APIGWClient: any,
//     dynamodbClient: any,
//     scanCommand: any,
//     postToConnectionCommand: any,
//     deleteCommand: any,
//     username: string,
//     cognitoId: string,
//     type: string,
// ): Promise<void> {
//     // send websocket to everyone that has connected
//     const getConnectionsParams = {
//         TableName: connectionsTableName,
//         ProjectionExpression: 'connectionId',
//     };
//     // scan db for all connections
//     const scanResponse = await dynamodbClient.send(new scanCommand(getConnectionsParams));
Object.defineProperty(exports, "__esModule", { value: true });
exports.websocketBroadcaster = void 0;
//     if (!scanResponse.Items) return;
//     for (const connection of scanResponse.Items) {
//         const connectionId = connection.connectionId;
//         const data = JSON.stringify({
//             type: type,
//             username: username,
//             cognitoId: cognitoId,
//         });
//         try {
//             const response = await APIGWClient.send(
//                 new postToConnectionCommand({
//                     ConnectionId: connectionId,
//                     Data: data,
//                 }),
//             );
//             console.log({ response });
//         } catch (e: any) {
//             if (e.statusCode === 410) {
//                 console.log(`Found stale connection, deleting ${connectionId}`);
//                 await dynamodbClient.send(
//                     new deleteCommand({
//                         TableName: connectionsTableName,
//                         Key: { connectionId },
//                     }),
//                 );
//                 throw e;
//             }
//             console.log({ e });
//         }
//     }
// }
class websocketBroadcaster {
    constructor(connectionsTableName, APIGWClient, dynamodbClient, scanCommand, postToConnectionCommand, deleteCommand, username, cognitoId) {
        this.connectionsTableName = connectionsTableName;
        this.APIGWClient = APIGWClient;
        this.dynamodbClient = dynamodbClient;
        this.scanCommand = scanCommand;
        this.postToConnectionCommand = postToConnectionCommand;
        this.deleteCommand = deleteCommand;
        this.username = username;
        this.cognitoId = cognitoId;
    }
    async broadcast(type) {
        // send websocket to everyone that uses has connected
        const getConnectionsParams = {
            TableName: this.connectionsTableName,
            ProjectionExpression: 'connectionId',
        };
        // scan db for all connections
        const scanResponse = await this.dynamodbClient.send(new this.scanCommand(getConnectionsParams));
        if (!scanResponse.Items)
            return;
        for (const connection of scanResponse.Items) {
            const connectionId = connection.connectionId;
            const data = JSON.stringify({
                type: type,
                username: this.username,
                cognitoId: this.cognitoId,
            });
            try {
                const response = await this.APIGWClient.send(new this.postToConnectionCommand({
                    ConnectionId: connectionId,
                    Data: data,
                }));
                console.log({ response });
            }
            catch (e) {
                if (e.statusCode === 410) {
                    console.log(`Found stale connection, deleting ${connectionId}`);
                    await this.dynamodbClient.send(new this.deleteCommand({
                        TableName: this.connectionsTableName,
                        Key: { connectionId },
                    }));
                    throw e;
                }
                console.log({ e });
            }
        }
    }
}
exports.websocketBroadcaster = websocketBroadcaster;
