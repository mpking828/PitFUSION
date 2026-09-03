import { proxy, onRequestOptions } from '../_proxy.js';

export { onRequestOptions };

export const onRequestGet = (context) =>
  proxy(context, {
    upstream: 'https://frc.nexus/api/v1',
    headers: { 'Nexus-Api-Key': context.env.NEXUS_API_KEY },
    cacheSeconds: 10,
  });
