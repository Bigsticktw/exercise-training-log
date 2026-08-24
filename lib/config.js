import { isValidEndpoint } from './record.js';

export function isValidToken(token) {
  return typeof token === 'string' && token.trim().length >= 24 && token.trim().length <= 256;
}

export function isValidConfig(config) {
  return Boolean(config && isValidEndpoint(config.endpoint) && isValidToken(config.token));
}
