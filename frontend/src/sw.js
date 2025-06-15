import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';

// This is injected by the PWA plugin. It contains the list of files to cache.
precacheAndRoute(self.__WB_MANIFEST);

// Caching strategy for API GET requests (same as in vite.config.js)
registerRoute(
    ({ url }) => url.pathname.startsWith('/api/') && url.method === 'GET',
    new StaleWhileRevalidate({
        cacheName: 'api-cache',
        plugins: [
            new ExpirationPlugin({
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60, // 1 Day
            }),
        ],
    })
);

// Background Sync for non-GET requests to the API
const bgSyncPlugin = new BackgroundSyncPlugin('api-mutation-queue', {
  maxRetentionTime: 24 * 60 // Retry for up to 24 hours
});

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') && url.method !== 'GET',
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  })
);