import AWS from 'aws-sdk';
import httpMiddleware from '../middlewares/http';

const db = new AWS.DynamoDB.DocumentClient();

async function getAuctions(event, context) {
  const result = await db.scan({
    TableName: process.env.AUCTIONS_TABLE_NAME,
  }).promise();

  const auctions = result.Items;

  return {
    statusCode: 200,
    body: JSON.stringify({ auctions }),
  };
}

export const handler = httpMiddleware(getAuctions);
