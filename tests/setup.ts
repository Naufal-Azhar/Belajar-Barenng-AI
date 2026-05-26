import '@testing-library/jest-dom/vitest';

// jsdom tidak punya scrollIntoView by default. Beberapa komponen
// (mis. ChatStream) memanggilnya di useEffect agar auto-scroll ke bawah.
// Polyfill ini cukup buat test environment supaya komponen render tanpa error.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {
    /* noop */
  };
}
