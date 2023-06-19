"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postConfirmationHandler = void 0;
const postConfirmationHandler = async (event, context, callback) => {
    console.log('EVENT', event);
    console.info('EVENT info\n' + JSON.stringify(event, null, 2));
    return event;
};
exports.postConfirmationHandler = postConfirmationHandler;
