import { v4 as uuid } from 'uuid';
import AWS from 'aws-sdk';
import errors from 'http-errors';
import httpMiddleware from '../middlewares/http';

const db = new AWS.DynamoDB.DocumentClient();

async function createAuction(event, context) {
  const { title } = event.body;
  const now = new Date();

  const auction = {
    id: uuid(),
    title,
    status: 'OPEN',
    createdAt: now.toISOString(),
  };

  try {
    await db.put({
      TableName: process.env.AUCTIONS_TABLE_NAME,
      Item: auction,
    }).promise();
  } catch (e) {
    console.error(e);
    throw new errors.InternalServerError(e);
  }

  return {
    statusCode: 201,
    body: JSON.stringify({ auction }),
  };
}

export const handler = httpMiddleware(createAuction);
