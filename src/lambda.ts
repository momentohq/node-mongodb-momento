import { RemovalPolicy } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export function lambda<A extends Function>(scope: Construct, id: string, props: any, c: new (scope: Construct, id: string, props: any) => A): A {
  const f = new c(scope, id, {
    memorySize: 512,
    ...props,
  });
  f.role?.addToPrincipalPolicy(new PolicyStatement({
    effect: Effect.DENY,
    actions: ['logs:CreateLogGroup'],
    resources: ['*'],
  }));
  new LogGroup(scope, 'LeaderLogs', { logGroupName: `/aws/lambda/${f.functionName}`, removalPolicy: RemovalPolicy.DESTROY, retention: RetentionDays.ONE_WEEK });
  return f;
}