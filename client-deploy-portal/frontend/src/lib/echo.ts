import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// @ts-ignore
window.Pusher = Pusher;

export const echo = new Echo({
  broadcaster: 'reverb',
  key: process.env.NEXT_PUBLIC_REVERB_APP_KEY || 'clientdeploy-key',
  wsHost: process.env.NEXT_PUBLIC_REVERB_HOST || window.location.hostname,
  wsPort: parseInt(process.env.NEXT_PUBLIC_REVERB_PORT || '8080'),
  wssPort: parseInt(process.env.NEXT_PUBLIC_REVERB_PORT || '8080'),
  forceTLS: (process.env.NEXT_PUBLIC_REVERB_SCHEME || 'http') === 'https',
  enabledTransports: ['ws', 'wss'],
  authEndpoint: `${process.env.NEXT_PUBLIC_API_URL || '/api'}/broadcasting/auth`,
  auth: {
    headers: {
      Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state.token : '' : ''}`,
      Accept: 'application/json',
    },
  },
});
