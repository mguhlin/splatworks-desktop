// Workers have no DOM bridge. The same revocable Go gate authorizes every request.
const localFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
  if (url.origin === location.origin || ['data:', 'blob:'].includes(url.protocol)) return localFetch(input, init);
  return localFetch('/desktop/remote?url='+encodeURIComponent(url.href), {...init, credentials:'omit', referrerPolicy:'no-referrer'});
};
