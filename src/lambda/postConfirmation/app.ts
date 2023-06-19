import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const postConfirmationHandler = async (event: APIGatewayProxyEvent, context: any, callback: any) => {
    console.log('EVENT', event);
    console.info('EVENT\n' + JSON.stringify(event, null, 2));

    callback(null, event);
};
