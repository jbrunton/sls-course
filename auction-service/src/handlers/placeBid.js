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
  const { principalId, email } = event.requestContext.authorizer;

  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id },
    UpdateExpression: 'set highestBid.amount = :amount, highestBid.bidder = :bidder',
    ExpressionAttributeValues: {
      ':amount': amount,
      ':bidder': { principalId, email },
    },
    ReturnValues: 'ALL_NEW',
  };

  const auction = await getAuctionById(id);
  if (auction.status !== 'OPEN') {
    throw new errors.Forbidden('Auction is closed');
  }

  if (principalId === auction.seller.principalId) {
    throw new errors.Forbidden("You cannot bid on your own auction");
  }

  const highestBid = auction.highestBid;
  if (amount <= highestBid.amount) {
    throw new errors.Forbidden(`Your bid must be higher than ${highestBid.amount}`);
  }

  if (principalId === highestBid?.bidder?.principalId) {
    throw new errors.Forbidden("You are already the highest bidder");
  }

  const result = await db.update(params).promise();

  return {
    statusCode: 200,
    body: JSON.stringify({ auction: result.Attributes }),
  };
}

export const handler = httpMiddleware(placeBid)
  .use(validator({ inputSchema: schema }));
