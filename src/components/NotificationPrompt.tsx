"use client";

import { useState, useEffect } from "react";

export default function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "granted" | "denied">("idle");

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "granted") {
      setStatus("granted");
      subscribeUser();
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    // Show prompt after 2 seconds
    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  async function subscribeUser() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisuallyConsented: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      } as PushSubscriptionOptionsInit);

      const subJson = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });
    } catch (err) {
      console.error("Push subscription failed:", err);
    }
  }

  async function enableNotifications() {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setStatus("granted");
      setShow(false);
      await subscribeUser();
    } else {
      setStatus("denied");
      setShow(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-card border border-accent/30 rounded-xl p-4 shadow-lg z-50">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔔</span>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Enable Nudge Notifications</h3>
          <p className="text-xs text-muted mt-1">Get reminded about your goals at the times you set.</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={enableNotifications}
              className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/90"
            >
              Enable
            </button>
            <button
              onClick={() => setShow(false)}
              className="px-3 py-1.5 text-muted text-xs hover:text-foreground"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
