import AWS from 'aws-sdk';
import validator from '@middy/validator';
import httpMiddleware from '../middlewares/http';

const db = new AWS.DynamoDB.DocumentClient();

const schema = {
  type: 'object',
  properties: {
    queryStringParameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['OPEN', 'CLOSED'],
          default: 'OPEN',
        },
      },
    },
  },
  required: [
    'queryStringParameters',
  ]
};

async function getAuctions(event, context) {
  const { status } = event.queryStringParameters;

  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    IndexName: 'statusAndEndDate',
    KeyConditionExpression: '#status = :status',
    ScanIndexForward: true,
    ExpressionAttributeValues: {
      ':status': status,
    },
    ExpressionAttributeNames: {
      '#status': 'status',
    },
  };

  const result = await db.query(params).promise();

  const auctions = result.Items;

  return {
    statusCode: 200,
    body: JSON.stringify({ auctions }),
  };
}

export const handler = httpMiddleware(getAuctions)
  .use(validator({ inputSchema: schema }));
