import errors from 'http-errors';
import AWS from 'aws-sdk';

const db = new AWS.DynamoDB.DocumentClient();

export async function getAuctionById(id) {
  const result = await db.get({
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id }
  }).promise();

  const auction = result.Item;

  if (!auction) {
    throw new errors.NotFound(`Auction with ID ${id} not found`);
  }

  return auction;
}
