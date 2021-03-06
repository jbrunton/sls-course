import middy from '@middy/core';
import bodyParser from '@middy/http-json-body-parser';
import eventNormalizer from '@middy/http-event-normalizer';
import errorHandler from '@middy/http-error-handler';
import cors from '@middy/http-cors';
import errors from 'http-errors';

export const hideServerErrors = () => {
  const onError = async (request) => {
    const { error } = request;
    if (!errors.isHttpError(error)) {
      request.error = new errors.InternalServerError(error);
    }
  };

  return {
    onError,
  };
};

export const defaultErrorHandler = () => errorHandler({
  logger: error => console.error(error)
});

export default handler => middy(handler)
  .use([
    bodyParser(),
    eventNormalizer(),
    hideServerErrors(),
    defaultErrorHandler(),
    cors(),
  ]);
