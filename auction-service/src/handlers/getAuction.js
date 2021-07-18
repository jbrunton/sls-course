import httpMiddleware from '../middlewares/http';
import { getAuctionById } from '../controllers/auctions';

async function getAuction(event, context) {
  const { id } = event.pathParameters;
  const auction = await getAuctionById(id);
  return {
    statusCode: 200,
    body: JSON.stringify({ auction }),
  };
}

export const handler = httpMiddleware(getAuction);
