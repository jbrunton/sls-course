import AWS from 'aws-sdk';
import httpMiddleware from '../middlewares/http';
import errors from 'http-errors';

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
    const result = await db.update(params).promise();

    const auction = result.Attributes;

    return {
      statusCode: 200,
      body: JSON.stringify({ auction }),
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
