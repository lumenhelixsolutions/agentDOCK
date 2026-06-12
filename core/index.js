/**
 * C.O.R.E. — Computational Object Runtime Environment
 * Interceptor-pattern gateway for unified AI orchestration.
 */

const { AgentClient, createAgentClient } = require('./agent-client');
const { ProviderGateway } = require('./gateway');
const { AccessDeniedException, ProviderError, CoreError } = require('./errors');

module.exports = {
  AgentClient,
  createAgentClient,
  ProviderGateway,
  AccessDeniedException,
  ProviderError,
  CoreError,
  storage: require('./storage'),
  pricing: require('./pricing'),
  pricingFetch: require('./pricing-fetch'),
  policy: require('./policy'),
  cache: require('./cache'),
  middleware: require('./middleware'),
  providers: require('./providers'),
  mediated: require('./mediated'),
  notifications: require('./notifications'),
  langfuseExport: require('./langfuse-export'),
  bridge: require('./bridge'),
};