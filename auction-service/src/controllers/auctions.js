import errors from 'http-errors';
import AWS from 'aws-sdk';

const db = new AWS.DynamoDB.DocumentClient();
const queue = new AWS.SQS();
const s3 = new AWS.S3();

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

  const { title, seller: { email: sellerEmail }, highestBid } = auction;

  if (highestBid.amount === 0) {
    await queue.sendMessage({
      QueueUrl: process.env.MAIL_QUEUE_URL,
      MessageBody: JSON.stringify({
        subject: 'Your item has not been sold',
        recipient: sellerEmail,
        body: `Your item "${title}" had no bids and has not been sold.`,
      }),
    }).promise();

    return;
  }

  const { amount, bidder: { email: bidderEmail } } = highestBid;

  const notifySeller = queue.sendMessage({
    QueueUrl: process.env.MAIL_QUEUE_URL,
    MessageBody: JSON.stringify({
      subject: 'Your item has been sold',
      recipient: sellerEmail,
      body: `Your item "${title}" has been sold for $${amount}.`,
    }),
  }).promise();

  const notifyBidder = queue.sendMessage({
    QueueUrl: process.env.MAIL_QUEUE_URL,
    MessageBody: JSON.stringify({
      subject: 'You won an auction',
      recipient: bidderEmail,
      body: `You won the auction "${title}" for $${amount}.`,
    }),
  }).promise();

  await Promise.all([notifySeller, notifyBidder]);
}

export async function uploadImage(auction, body) {
  const key = `${auction.id}.jpg`;

  const { Location } = await s3.upload({
    Bucket: process.env.AUCTIONS_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentEncoding: 'base64',
    ContentType: 'image/jpeg',
  }).promise();

  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    Key: { id: auction.id },
    UpdateExpression: 'set imageUrl = :imageUrl',
    ExpressionAttributeValues: {
      ':imageUrl': Location,
    },
  };

  await db.update(params).promise();

  return Location;
}
