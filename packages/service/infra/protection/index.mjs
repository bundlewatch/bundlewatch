import {
  APIGatewayClient,
  GetStageCommand as GetRestStageCommand,
  UpdateStageCommand as UpdateRestStageCommand,
} from '@aws-sdk/client-api-gateway';
import {
  ApiGatewayV2Client,
  GetStageCommand,
  UpdateStageCommand,
} from '@aws-sdk/client-apigatewayv2';
import { BudgetsClient, DescribeBudgetCommand } from '@aws-sdk/client-budgets';
// The small administrator-deployed controller uses the Lambda runtime's SDK.
import { CloudFormationClient, paginateListStackResources } from '@aws-sdk/client-cloudformation';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  DescribeTableCommand,
  UpdateTableCommand,
} from '@aws-sdk/client-dynamodb';
import {
  LambdaClient,
  GetFunctionConcurrencyCommand,
  PutFunctionConcurrencyCommand,
} from '@aws-sdk/client-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

import { createController } from './controller.mjs';

const config = {
  maxAttempts: 3,
  requestHandler: { connectionTimeout: 3000, requestTimeout: 5000 },
};
const cloudformation = new CloudFormationClient(config);
const dynamodb = new DynamoDBClient(config);
const lambda = new LambdaClient(config);
const sns = new SNSClient(config);
const budgets = new BudgetsClient(config);
const http = new ApiGatewayV2Client(config);
const rest = new APIGatewayClient(config);
const { STATE_TABLE, SERVICE_STACK, LEGACY_FUNCTION, TRIP_TOPIC, ALERT_TOPIC } = process.env;
const read = (settings = {}) => ({
  rate: settings.ThrottlingRateLimit,
  burst: settings.ThrottlingBurstLimit,
});
const readRest = (settings = {}) => ({
  rate: settings.throttlingRateLimit < 0 ? undefined : settings.throttlingRateLimit,
  burst: settings.throttlingBurstLimit < 0 ? undefined : settings.throttlingBurstLimit,
});
const write = (value) => ({ ThrottlingRateLimit: value.rate, ThrottlingBurstLimit: value.burst });

export const handler = createController(
  {
    async budget() {
      const { Budget } = await budgets.send(
        new DescribeBudgetCommand({
          AccountId: process.env.ACCOUNT_ID,
          BudgetName: process.env.BUDGET_NAME,
        }),
      );
      if (
        Budget?.CalculatedSpend?.ActualSpend?.Unit !== 'USD' ||
        Budget?.BudgetLimit?.Unit !== 'USD'
      )
        throw new Error('Expected USD budget');
      return {
        amount: Number(Budget.CalculatedSpend.ActualSpend.Amount),
        limit: Number(Budget.BudgetLimit.Amount),
      };
    },
    configuredTargets() {
      return [
        {
          name: process.env.SERVICE_FUNCTION,
          limit: Number(process.env.SERVICE_CONCURRENCY),
          optional: true,
        },
        ...(LEGACY_FUNCTION
          ? [
              {
                name: LEGACY_FUNCTION,
                limit: Number(process.env.LEGACY_CONCURRENCY),
                optional: true,
              },
            ]
          : []),
      ];
    },
    stages() {
      return JSON.parse(process.env.API_STAGES).map((stage) => ({
        type: stage.type,
        api: stage.api,
        name: stage.name,
        optional: stage.optional,
        key: `${stage.type}:${stage.api}:${stage.name}`,
        rate: 10,
        burst: 50,
      }));
    },
    async getStage(stage) {
      if (stage.type === 'HTTP') {
        const value = await http.send(
          new GetStageCommand({ ApiId: stage.api, StageName: stage.name }),
        );
        return {
          defaults: read(value.DefaultRouteSettings),
          routes: Object.fromEntries(
            Object.entries(value.RouteSettings ?? {}).map(([key, settings]) => [
              key,
              read(settings),
            ]),
          ),
        };
      }
      const value = await rest.send(
        new GetRestStageCommand({ restApiId: stage.api, stageName: stage.name }),
      );
      return {
        defaults: readRest(value.methodSettings?.['*/*']),
        routes: Object.fromEntries(
          Object.entries(value.methodSettings ?? {})
            .filter(([key]) => key !== '*/*')
            .map(([key, settings]) => [key, readRest(settings)]),
        ),
      };
    },
    async setStage(stage, settings) {
      if (stage.type === 'HTTP') {
        await http.send(
          new UpdateStageCommand({
            ApiId: stage.api,
            StageName: stage.name,
            DefaultRouteSettings: write(settings.defaults),
            RouteSettings: Object.fromEntries(
              Object.entries(settings.routes).map(([key, value]) => [key, write(value)]),
            ),
          }),
        );
      } else {
        const patchOperations = Object.entries({
          '*/*': settings.defaults,
          ...settings.routes,
        }).flatMap(([key, value]) => {
          const split = key.lastIndexOf('/');
          const resource = key.slice(0, split).replaceAll('/', '~1');
          const method = key.slice(split + 1);
          return [
            ['rateLimit', value.rate],
            ['burstLimit', value.burst],
          ].map(([field, limit]) => ({
            op: 'replace',
            path: `/${resource}/${method}/throttling/${field}`,
            value: String(limit),
          }));
        });
        await rest.send(
          new UpdateRestStageCommand({
            restApiId: stage.api,
            stageName: stage.name,
            patchOperations,
          }),
        );
      }
    },
    async limitStore() {
      const TableName = process.env.STORE_TABLE;
      const { Table } = await dynamodb.send(new DescribeTableCommand({ TableName }));
      if (Table.BillingModeSummary?.BillingMode !== 'PAY_PER_REQUEST') {
        throw new Error('Baseline table must remain on-demand; review its owning stack');
      }
      if (
        Table.OnDemandThroughput?.MaxReadRequestUnits !== 100 ||
        Table.OnDemandThroughput?.MaxWriteRequestUnits !== 400
      ) {
        await dynamodb.send(
          new UpdateTableCommand({
            TableName,
            OnDemandThroughput: { MaxReadRequestUnits: 100, MaxWriteRequestUnits: 400 },
          }),
        );
      }
    },
    async read() {
      const { Item } = await dynamodb.send(
        new GetItemCommand({
          TableName: STATE_TABLE,
          Key: { id: { S: 'service' } },
          ConsistentRead: true,
        }),
      );
      return Item ? JSON.parse(Item.state.S) : undefined;
    },
    async write(state) {
      await dynamodb.send(
        new PutItemCommand({
          TableName: STATE_TABLE,
          Item: { id: { S: 'service' }, state: { S: JSON.stringify(state) } },
        }),
      );
    },
    async targets() {
      const targets = [];
      for await (const page of paginateListStackResources(
        { client: cloudformation },
        { StackName: SERVICE_STACK },
      )) {
        for (const resource of page.StackResourceSummaries ?? []) {
          if (resource.LogicalResourceId === 'ServiceFunction' && resource.PhysicalResourceId) {
            targets.push({
              name: resource.PhysicalResourceId,
              limit: Number(process.env.SERVICE_CONCURRENCY),
            });
          }
        }
      }
      if (!targets.length) throw new Error('ServiceFunction missing from service stack');
      if (LEGACY_FUNCTION) {
        targets.push({
          name: LEGACY_FUNCTION,
          limit: Number(process.env.LEGACY_CONCURRENCY),
          optional: true,
        });
      }
      return targets;
    },
    async getConcurrency(name) {
      const result = await lambda.send(new GetFunctionConcurrencyCommand({ FunctionName: name }));
      return result.ReservedConcurrentExecutions;
    },
    async setConcurrency(name, limit) {
      await lambda.send(
        new PutFunctionConcurrencyCommand({
          FunctionName: name,
          ReservedConcurrentExecutions: limit,
        }),
      );
    },
    async notify(subject, message) {
      await sns.send(
        new PublishCommand({ TopicArn: ALERT_TOPIC, Subject: subject, Message: message }),
      );
    },
  },
  { tripTopicArn: TRIP_TOPIC },
);
