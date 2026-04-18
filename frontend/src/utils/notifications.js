function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/sw.js');
}

async function subscribeToPush(registration, vapidPublicKey) {
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
}

async function savePushSubscription(subscription) {
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
}

export async function initPushNotifications() {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    const registration = await registerServiceWorker();
    if (!registration) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const resp = await fetch('/api/push/vapid-public-key');
    if (!resp.ok) return;
    const { publicKey } = await resp.json();
    const subscription = await subscribeToPush(registration, publicKey);
    await savePushSubscription(subscription);
  } catch (e) {
    console.warn('Push notification setup failed:', e);
  }
}
