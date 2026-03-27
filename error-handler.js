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
    console.error('[ErrorHandler] Uncaught error:', message);
    if (typeof _prevOnError === 'function') {
      return _prevOnError.apply(this, arguments);
    }
    return false;
  };

  window.onunhandledrejection = function (event) {
    console.error('[ErrorHandler] Unhandled promise rejection:', event && event.reason && event.reason.message || 'unknown');
    if (typeof _prevOnUnhandledRejection === 'function') {
      _prevOnUnhandledRejection.call(this, event);
    }
  };
})();
