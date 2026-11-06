// Web app manifest — makes Team Hub installable (served at /manifest.webmanifest)
export default function manifest() {
  return {
    name: 'Team Hub',
    short_name: 'Team Hub',
    description: 'Collaborative workspace for goals, announcements and action items',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#0b0f17',
    theme_color: '#4f46e5',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
