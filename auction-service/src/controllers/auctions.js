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

export async function getEndedAuctions() {
  const now = new Date();
  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    IndexName: 'statusAndEndDate',
    KeyConditionExpression: '#status = :status AND endingAt <= :now',
    ExpressionAttributeValues: {
      ':status': 'OPEN',
      ':now': now.toISOString(),
    },
    ExpressionAttributeNames: {
      '#status': 'status',
    },
  };

  const result = await db.query(params).promise();

  return result.Items;
}

export async function closeAuction(auction) {
  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id: auction.id },
    UpdateExpression: 'set #status = :status',
    ExpressionAttributeValues: {
      ':status': 'CLOSED',
    },
    ExpressionAttributeNames: {
      '#status': 'status',
    },
  };

  await db.update(params).promise();
}
