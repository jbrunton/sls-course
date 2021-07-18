import AWS from 'aws-sdk';
import httpMiddleware from '../middlewares/http';
import errors from 'http-errors';

const db = new AWS.DynamoDB.DocumentClient();

async function getAuctions(event, context) {
  try {
    const result = await db.scan({
      TableName: process.env.AUCTIONS_TABLE_NAME,
    }).promise();

    const auctions = result.Items;

    return {
      statusCode: 200,
      body: JSON.stringify({ auctions }),
    };
  } catch (e) {
    console.error(e);
    throw new errors.InternalServerError(e);
  }
}

export const handler = httpMiddleware(getAuctions);
