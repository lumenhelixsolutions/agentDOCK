/**
 * C.O.R.E. — Server bridge for shared AgentClient instance.
 */

let clientGetter = null;

function setCoreClientGetter(fn) {
  clientGetter = typeof fn === 'function' ? fn : null;
}

function resolveCoreClient(explicit) {
  if (explicit) return explicit;
  if (clientGetter) return clientGetter();
  const { createAgentClient } = require('./agent-client');
  const { postJSON, getApiKey } = require('../advisor');
  return createAgentClient({
    hootRoot: require('path').join(__dirname, '..'),
    deps: { postJSON, getApiKey },
  });
}

module.exports = {
  setCoreClientGetter,
  resolveCoreClient,
};