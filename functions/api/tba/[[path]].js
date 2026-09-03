import { proxy, onRequestOptions } from '../_proxy.js';

export { onRequestOptions };

export const onRequestGet = (context) =>
  proxy(context, {
    upstream: 'https://www.thebluealliance.com/api/v3',
    headers: { 'X-TBA-Auth-Key': context.env.TBA_API_KEY },
    cacheSeconds: 30,
  });
