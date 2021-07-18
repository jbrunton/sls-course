import AWS from 'aws-sdk';
import httpMiddleware from '../middlewares/http';
import errors from 'http-errors';
import { getAuctionById } from '../controllers/auctions';

const db = new AWS.DynamoDB.DocumentClient();

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

  try {
    const auction = await getAuctionById(id);
    const highestBid = auction.highestBid.amount;

    if (amount <= highestBid) {
      throw new errors.Forbidden(`Your bid must be higher than ${highestBid}`);
    }

    const result = await db.update(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ auction: result.Attributes }),
    };
  } catch (e) {
    if (errors.isHttpError(e)) {
      throw e;
    } else {
      console.error(e);
      throw new errors.InternalServerError(e);
    }
  }
}

export const handler = httpMiddleware(placeBid);
