import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const connectHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
 console.log({event})

    try {
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'websocket connected',
            }),
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'some error happened',
            }),
        };
    }
};