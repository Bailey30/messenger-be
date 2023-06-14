"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectHandler = void 0;
const connectHandler = async (event) => {
    console.log({ event });
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
exports.connectHandler = connectHandler;
