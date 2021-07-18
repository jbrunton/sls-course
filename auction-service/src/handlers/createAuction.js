import { v4 as uuid } from 'uuid';
import AWS from 'aws-sdk';
import httpMiddleware from '../middlewares/http';
import validator from '@middy/validator';

const db = new AWS.DynamoDB.DocumentClient();

const schema = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
        },
      },
      required: ['title'],
    },
  },
  required: ['body'],
};

async function createAuction(event, context) {
  const { title } = event.body;
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(endDate.getHours() + 1);

  const auction = {
    id: uuid(),
    title,
    status: 'OPEN',
    createdAt: now.toISOString(),
    endingAt: endDate.toISOString(),
    highestBid: {
      amount: 0,
    }
  };

  await db.put({
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Item: auction,
  }).promise();

  return {
    statusCode: 201,
    body: JSON.stringify({ auction }),
  };
}

export const handler = httpMiddleware(createAuction)
  .use(validator({ inputSchema: schema }));
