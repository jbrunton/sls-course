import middy from "@middy/core";
import errors from "http-errors";
import validator from '@middy/validator';
import cors from '@middy/http-cors';
import { getAuctionById, uploadImage } from "../controllers/auctions";
import { defaultErrorHandler, hideServerErrors } from "../middlewares/http";

const schema = {
  type: 'object',
  properties: {
    body: {
      type: 'string',
      minLength: 1,
      pattern: '\=$',
    },
  },
  required: ['body'],
};

export async function uploadAuctionImage(event) {
  const { id } = event.pathParameters;
  const { principalId } = event.requestContext.authorizer;

  const base64 = event.body.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');

  const auction = await getAuctionById(id);

  if (principalId !== auction.seller.principalId) {
    throw new errors.Forbidden("You can only upload images to your own auctions");
  }

  const imageUrl = await uploadImage(auction, buffer);

  return {
    statusCode: 200,
    body: JSON.stringify({
      imageUrl,
    }),
  };
}

export const handler = middy(uploadAuctionImage)
  .use([
    hideServerErrors(),
    defaultErrorHandler(),
    validator({ inputSchema: schema }),
    cors(),
  ]);
