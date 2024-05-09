const customVerificationEmailHandler = async (event: any) => {
    console.log({ event });
    if (event.triggerSource === 'CustomMessage_SignUp') {
        const message = `Thank you for signing up. Click this link to verify your account: http://localhost:3000/verify?code=${event.request.codeParameter}&email=${event.userName}.`;
        event.response.smsMessage = message;
        event.response.emailMessage = message;
        event.response.emailSubject = 'Welcome to the service.';
    }
    return event;
};

export { customVerificationEmailHandler };
