export const contentSecurityPolicy=[
 "default-src 'none'","script-src 'self'","script-src-attr 'none'","style-src 'self' 'unsafe-inline'",
 "img-src 'self' data: blob:","font-src 'self' data:","connect-src 'self'","media-src 'none'",
 "object-src 'none'","base-uri 'none'","form-action 'none'","frame-src 'none'","frame-ancestors 'none'","worker-src 'none'",
].join('; ');
export const securityHeaders=Object.freeze({
 'Content-Security-Policy':contentSecurityPolicy,
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'strict-origin-when-cross-origin',
 'X-Frame-Options':'DENY',
 'Cross-Origin-Opener-Policy':'same-origin',
 'Cross-Origin-Resource-Policy':'same-origin',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
});
