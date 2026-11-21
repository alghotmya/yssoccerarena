#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { MultiplayerStack } from '../lib/multiplayer-stack'

const app = new cdk.App()

new MultiplayerStack(app, 'YssoccerMultiplayerStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'ca-central-1',
  },
  description: 'Face-Off arcade online multiplayer (API Gateway WebSocket + Lambda)',
})
