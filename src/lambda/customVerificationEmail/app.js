"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customVerificationEmailHandler = void 0;
const customVerificationEmailHandler = async (event) => {
    console.log({ event });
    if (event.triggerSource === 'CustomMessage_SignUp') {
        const message = `Thank you for signing up. Click this link to verify your account: http://localhost:3000/verify?code=${event.request.codeParameter}&email=${event.userName}.`;
        event.response.smsMessage = message;
        event.response.emailMessage = message;
        event.response.emailSubject = 'Welcome to the service.';
    }
    return event;
};
exports.customVerificationEmailHandler = customVerificationEmailHandler;
