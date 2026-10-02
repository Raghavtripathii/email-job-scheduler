import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env';

export const EMAIL_INDEX = 'emails';

// short timeouts so a dead elasticsearch never hangs the api
export const elastic = new Client({
  node: env.ELASTICSEARCH_URL,
  requestTimeout: 5000,
  maxRetries: 1,
});