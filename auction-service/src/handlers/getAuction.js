import AWS from 'aws-sdk';
import middy from '@middy/core';
import bodyParser from '@middy/http-json-body-parser';
import eventNormalizer from '@middy/http-event-normalizer';
import errorHandler from '@middy/http-error-handler';
import errors from 'http-errors';

const db = new AWS.DynamoDB.DocumentClient();

async function getAuction(event, context) {
  const { id } = event.pathParameters;
  try {
    const result = await db.get({
      TableName: process.env.AUCTIONS_TABLE_NAME,
      Key: { id }
    }).promise();

    const auction = result.Item;

    if (!auction) {
      throw new errors.NotFound(`Auction with ID ${id} not found`);
    }

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

export const handler = middy(getAuction)
  .use(bodyParser())
  .use(eventNormalizer())
  .use(errorHandler());
