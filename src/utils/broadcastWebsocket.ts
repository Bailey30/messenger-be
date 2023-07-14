export class websocketBroadcaster {
    constructor(
        private connectionsTableName: any,
        private APIGWClient: any,
        private dynamodbClient: any,
        private scanCommand: any,
        private postToConnectionCommand: any,
        private deleteCommand: any,
        private username: string,
        private cognitoId: string,
    ) {}

    async broadcast(type: string): Promise<void> {
        // send websocket to everyone that uses has connected
        const getConnectionsParams = {
            TableName: this.connectionsTableName,
            ProjectionExpression: 'connectionId',
        };
        // scan db for all connections
        const scanResponse = await this.dynamodbClient.send(new this.scanCommand(getConnectionsParams));

        if (!scanResponse.Items) return;
        for (const connection of scanResponse.Items) {
            const connectionId = connection.connectionId;
            const data = JSON.stringify({
                type: type,
                username: this.username,
                cognitoId: this.cognitoId,
            });

            try {
                const response = await this.APIGWClient.send(
                    new this.postToConnectionCommand({
                        ConnectionId: connectionId,
                        Data: data,
                    }),
                );
                console.log({ response });
            } catch (e: any) {
                if (e.statusCode === 410) {
                    console.log(`Found stale connection, deleting ${connectionId}`);
                    await this.dynamodbClient.send(
                        new this.deleteCommand({
                            TableName: this.connectionsTableName,
                            Key: { connectionId },
                        }),
                    );
                    throw e;
                }
                console.log({ e });
            }
        }
    }
}
