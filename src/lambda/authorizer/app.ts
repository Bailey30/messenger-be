export const authorizerHandler = function (
    event: { headers: any; queryStringParameters: any; stageVariables: any; requestContext: any; methodArn: string },
    context: any,
    callback: any,
) {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // A simple REQUEST authorizer example to demonstrate how to use request
    // parameters to allow or deny a request. In this example, a request is
    // authorized if the client-supplied HeaderAuth1 header and QueryString1 query parameter
    // in the request context match the specified values of
    // of 'headerValue1' and 'queryValue1' respectively.

    // Retrieve request parameters from the Lambda function input:
    var headers = event.headers;
    var queryStringParameters = event.queryStringParameters;
    var stageVariables = event.stageVariables;
    var requestContext = event.requestContext;

    // Parse the input for the parameter values
    var tmp = event.methodArn.split(':');
    var apiGatewayArnTmp = tmp[5].split('/');
    var awsAccountId = tmp[4];
    var region = tmp[3];
    var ApiId = apiGatewayArnTmp[0];
    var stage = apiGatewayArnTmp[1];
    var route = apiGatewayArnTmp[2];

    // Perform authorization to return the Allow policy for correct parameters and
    // the 'Unauthorized' error, otherwise.
    var authResponse = {};
    var condition: any = {};
    condition.IpAddress = {};

    console.log('queryString token', queryStringParameters.token);

    if (queryStringParameters.token !== undefined) {
        callback(null, generateAllow('me', event.methodArn));
    } else {
        callback('Unauthorized');
    }
};

// Helper function to generate an IAM policy
var generatePolicy = function (principalId: any, effect: string, resource: any) {
    // Required output:
    var authResponse: any = {};
    authResponse.principalId = principalId;
    if (effect && resource) {
        var policyDocument: any = {};
        policyDocument.Version = '2012-10-17'; // default version
        policyDocument.Statement = [];
        var statementOne: any = {};
        statementOne.Action = 'execute-api:Invoke'; // default action
        statementOne.Effect = effect;
        statementOne.Resource = resource;
        policyDocument.Statement[0] = statementOne;
        authResponse.policyDocument = policyDocument;
    }
    // Optional output with custom properties of the String, Number or Boolean type.
    authResponse.context = {
        stringKey: 'stringval',
        numberKey: 123,
        booleanKey: true,
    };
    return authResponse;
};

var generateAllow = function (principalId: string, resource: any) {
    return generatePolicy(principalId, 'Allow', resource);
};

var generateDeny = function (principalId: any, resource: any) {
    return generatePolicy(principalId, 'Deny', resource);
};
