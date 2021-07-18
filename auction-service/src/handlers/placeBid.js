import AWS from 'aws-sdk';
import httpMiddleware from '../middlewares/http';
import errors from 'http-errors';
import { getAuctionById } from '../controllers/auctions';
import validator from '@middy/validator';

const db = new AWS.DynamoDB.DocumentClient();

const schema = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
        },
      },
      required: ['amount'],
    },
  },
  required: ['body'],
};

async function placeBid(event, context) {
  const { id } = event.pathParameters;
  const { amount } = event.body;

  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id },
    UpdateExpression: 'set highestBid.amount = :amount',
    ExpressionAttributeValues: {
      ':amount': amount
    },
    ReturnValues: 'ALL_NEW',
  };

  const auction = await getAuctionById(id);
  if (auction.status !== 'OPEN') {
    throw new errors.Forbidden('Auction is closed');
  }

  const highestBid = auction.highestBid.amount;
  if (amount <= highestBid) {
    throw new errors.Forbidden(`Your bid must be higher than ${highestBid}`);
  }

  const result = await db.update(params).promise();

  return {
    statusCode: 200,
    body: JSON.stringify({ auction: result.Attributes }),
  };
}

export const handler = httpMiddleware(placeBid)
  .use(validator({ inputSchema: schema }));
