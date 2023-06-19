import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const postConfirmationHandler = async (event: any, context: any, callback: any) => {
    console.log('EVENT', event);
    console.info('EVENT info\n' + JSON.stringify(event, null, 2));

    return event;
};
