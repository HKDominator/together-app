/** CR-02: parse a raw User-Agent string into a human-readable device label.
 *  Returns the browser name, falling back gracefully for empty/unknown UAs. */
export function parseDevice(ua: string): string {
  if (!ua) return 'Unknown device'
  if (/curl|PostmanRuntime|httpie|python-requests|insomnia/i.test(ua)) return 'API client'
  if (/Edg[A]?\//i.test(ua))                         return 'Edge'
  if (/OPR\//i.test(ua))                             return 'Opera'
  if (/CriOS\//i.test(ua))                           return 'Chrome (iOS)'
  if (/FxiOS\//i.test(ua))                           return 'Firefox (iOS)'
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return 'Chrome'
  if (/Firefox\//i.test(ua))                         return 'Firefox'
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua))  return 'Safari'
  const first = ua.split('/')[0]
  return first || 'Unknown device'
}
