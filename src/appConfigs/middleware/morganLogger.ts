import morgan, { StreamOptions } from 'morgan';
import logger from "../utilities/logger";
const Logger = new logger('HTTP');

const stream: StreamOptions = {
    write: (message) => Logger.http(message),
};

// Build the morgan middleware
const morganMiddleware = morgan(
    "Request-id :res[X-Request-Id] | :method :url :status :res[content-length] - :response-time ms",
    { stream }
);

export default morganMiddleware;
