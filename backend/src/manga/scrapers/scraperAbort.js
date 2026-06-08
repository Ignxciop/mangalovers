let _abortController = null;

export function getAbortSignal() {
  if (!_abortController) {
    _abortController = new AbortController();
  }
  return _abortController.signal;
}

export function abortScraper() {
  if (_abortController) {
    _abortController.abort();
    _abortController = null;
  }
}

export function resetAbortSignal() {
  if (_abortController && !_abortController.signal.aborted) {
    return;
  }
  _abortController = new AbortController();
}
