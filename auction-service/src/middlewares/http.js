import middy from '@middy/core';
import bodyParser from '@middy/http-json-body-parser';
import eventNormalizer from '@middy/http-event-normalizer';
import errorHandler from '@middy/http-error-handler';

export default handler => middy(handler)
  .use([
    bodyParser(),
    eventNormalizer(),
    errorHandler(),
  ]);
