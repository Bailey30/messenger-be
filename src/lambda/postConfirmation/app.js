"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postConfirmationHandler = void 0;
const postConfirmationHandler = async (event) => {
    console.log('EVENT', event);
    console.info('EVENT\n' + JSON.stringify(event, null, 2));
    try {
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'websocket connected',
            }),
        };
    }
    catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'some error happened',
            }),
        };
    }
};
exports.postConfirmationHandler = postConfirmationHandler;
