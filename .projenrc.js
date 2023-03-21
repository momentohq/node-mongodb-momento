const { Runtime } = require('aws-cdk-lib/aws-lambda');
const { awscdk } = require('projen');
const { LambdaRuntime } = require('projen/lib/awscdk');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.68.0',
  defaultReleaseBranch: 'main',
  name: 'momento-mongodb-read-cache',

  deps: [
    '@aws-cdk/aws-apigatewayv2-alpha',
    '@aws-cdk/aws-apigatewayv2-integrations-alpha',
    '@gomomento/sdk',
    'aws-lambda',
    'axios',
    'dotenv',
    'mongoose',
  ],
  lambdaOptions: {
    runtime: LambdaRuntime.NODEJS_18_X,
    awsSdkConnectionReuse: true,
  },
  devDeps: [
    'prettier',
    '@types/aws-lambda',
  ],
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();
