export class websocketBroadcaster {
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
