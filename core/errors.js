/**
 * C.O.R.E. — typed errors for gateway guardrails.
 */

class CoreError extends Error {
  constructor(message, code = 'CORE_ERROR') {
    super(message);
    this.name = 'CoreError';
    this.code = code;
  }
}

class AccessDeniedException extends CoreError {
  constructor(message, details = {}) {
    super(message, 'ACCESS_DENIED');
    this.name = 'AccessDeniedException';
    this.details = details;
  }
}

class ProviderError extends CoreError {
  constructor(message, provider, cause) {
    super(message, 'PROVIDER_ERROR');
    this.name = 'ProviderError';
    this.provider = provider;
    this.cause = cause;
  }
}

module.exports = {
  CoreError,
  AccessDeniedException,
  ProviderError,
};