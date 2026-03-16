/**
 * error-handler.js
 * Global error tracking altyapısı (G39)
 * Gelecekteki Sentry/LogRocket entegrasyonu için hazırlık.
 * Mevcut hata işleyicileriyle çakışmaz.
 */
(function () {
  'use strict';

  var _prevOnError = window.onerror;
  var _prevOnUnhandledRejection = window.onunhandledrejection;

  window.onerror = function (message, source, lineno, colno, error) {
    console.error('[ErrorHandler] Uncaught error:', {
      message: message,
      source: source,
      line: lineno,
      column: colno,
      error: error
    });
    if (typeof _prevOnError === 'function') {
      return _prevOnError.apply(this, arguments);
    }
    return false;
  };

  window.onunhandledrejection = function (event) {
    console.error('[ErrorHandler] Unhandled promise rejection:', {
      reason: event && event.reason,
      promise: event && event.promise
    });
    if (typeof _prevOnUnhandledRejection === 'function') {
      _prevOnUnhandledRejection.call(this, event);
    }
  };
})();
