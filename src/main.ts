import { App, CfnOutput, Stack, StackProps } from 'aws-cdk-lib'
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha'
import { Construct } from 'constructs'
import { PlayersFunction } from './players-function'
import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha'
import { lambda } from './lambda'
import dotenv from 'dotenv'
dotenv.config()

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props)


    const players = new HttpLambdaIntegration(
      'PlayersIntegration',
      lambda(
        this, 'Leaders',
        {
          environment: {
            COLLECTION_NAME: process.env.COLLECTION_NAME,
            MONGODB_URI: process.env.MONGODB_URI,
            MOMENTO_AUTH_TOKEN: process.env.MOMENTO_AUTH_TOKEN,
          },
        },
        PlayersFunction,
      )
    )

    const httpApi = new HttpApi(this, 'HttpApi')
    new CfnOutput(this, "PlayerUrl", { value: `${httpApi.url!}players` })

    httpApi.addRoutes({
      path: '/players',
      methods: [HttpMethod.GET, HttpMethod.POST],
      integration: players,
    })
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.AWS_ACCOUNT_ID,
  region: 'us-west-2',
}

const app = new App()

new MyStack(app, 'momento-mongodb-read-cache-dev', { env: devEnv })
// new MyStack(app, 'momento-mongodb-read-cache-prod', { env: prodEnv });

app.synth()