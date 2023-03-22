import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as targets from 'aws-cdk-lib/aws-events-targets'
import * as events from 'aws-cdk-lib/aws-events'
import { App, CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import dotenv from 'dotenv';
import { lambda } from './lambda';
import { PlayersFunction } from './players-function';
dotenv.config();

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const benchFunction = lambda(
      this, 'Benchmark',
      {
        environment: {
          COLLECTION_NAME: process.env.COLLECTION_NAME,
          MONGODB_URI: process.env.MONGODB_URI,
          MOMENTO_AUTH_TOKEN: process.env.MOMENTO_AUTH_TOKEN,
        },
      },
      PlayersFunction,
    )

    const eventRule = new events.Rule(this, 'scheduleRule', {
      schedule: events.Schedule.rate(Duration.minutes(1)),
    });
    eventRule.addTarget(new targets.LambdaFunction(benchFunction))

    const players = new HttpLambdaIntegration(
      'PlayersIntegration',
      lambda(
        this, 'LeaderBoard',
        {
          environment: {
            COLLECTION_NAME: process.env.COLLECTION_NAME,
            MONGODB_URI: process.env.MONGODB_URI,
            MOMENTO_AUTH_TOKEN: process.env.MOMENTO_AUTH_TOKEN,
          },
        },
        PlayersFunction,
      ),
    );

    const httpApi = new HttpApi(this, 'HttpApi');
    new CfnOutput(this, 'PlayerUrl', { value: `${httpApi.url!}players` });

    httpApi.addRoutes({
      path: '/players',
      methods: [HttpMethod.GET, HttpMethod.POST],
      integration: players,
    });
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.AWS_ACCOUNT_ID,
  region: 'us-west-2',
};

const app = new App();

new MyStack(app, 'momento-mongodb-read-cache-dev', { env: devEnv });
// new MyStack(app, 'momento-mongodb-read-cache-prod', { env: prodEnv });

app.synth();