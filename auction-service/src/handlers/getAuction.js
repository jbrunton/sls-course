import httpMiddleware from '../middlewares/http';
import errors from 'http-errors';
import { getAuctionById } from '../controllers/auctions';

async function getAuction(event, context) {
  const { id } = event.pathParameters;
  try {
    const auction = await getAuctionById(id);
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

export const handler = httpMiddleware(getAuction);
