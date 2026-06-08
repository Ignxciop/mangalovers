const controllers = {};

export function getAbortSignal(provider) {
  if (!controllers[provider]) {
    controllers[provider] = new AbortController();
  }
  return controllers[provider].signal;
}

export function abortScraper(provider) {
  if (controllers[provider]) {
    controllers[provider].abort();
  }
}

export function resetAbortSignal(provider) {
  if (!controllers[provider] || controllers[provider].signal.aborted) {
    controllers[provider] = new AbortController();
  }
}
