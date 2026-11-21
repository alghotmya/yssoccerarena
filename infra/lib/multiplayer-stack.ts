import * as cdk from 'aws-cdk-lib'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as path from 'path'
import { Construct } from 'constructs'

export class MultiplayerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const table = new dynamodb.Table(this, 'MultiplayerTable', {
      tableName: 'yssoccer-multiplayer',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    })

    const wsHandler = new NodejsFunction(this, 'WsHandler', {
      functionName: 'yssoccer-ws-handler',
      entry: path.join(__dirname, '../lambda/ws/handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        TABLE_NAME: table.tableName,
      },
      bundling: {
        minify: true,
        target: 'node20',
        sourceMap: true,
      },
    })

    table.grantReadWriteData(wsHandler)

    const webSocketApi = new apigwv2.WebSocketApi(this, 'GameWebSocketApi', {
      apiName: 'yssoccer-ws',
      connectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration('ConnectIntegration', wsHandler),
      },
      disconnectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration('DisconnectIntegration', wsHandler),
      },
      defaultRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration('DefaultIntegration', wsHandler),
      },
    })

    const stage = new apigwv2.WebSocketStage(this, 'ProdStage', {
      webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
    })

    webSocketApi.grantManageConnections(wsHandler)
    wsHandler.addEnvironment('CALLBACK_URL', stage.callbackUrl)

    new cdk.CfnOutput(this, 'WebSocketUrl', {
      value: stage.url,
      description: 'Set this as VITE_WS_URL for the Amplify / Vite frontend',
      exportName: 'YssoccerWebSocketUrl',
    })

    new cdk.CfnOutput(this, 'TableName', {
      value: table.tableName,
    })
  }
}
