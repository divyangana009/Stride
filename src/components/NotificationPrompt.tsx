"use client";

import { useState, useEffect } from "react";

export default function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Always show the prompt after 2 seconds
    const timer = setTimeout(() => {
      // Don't show if already dismissed this session
      if (sessionStorage.getItem("nudge-dismissed")) return;
      
      if (!("Notification" in window)) {
        // iPhone in Safari (not home screen) or unsupported browser
        setMessage("iphone");
        setShow(true);
        return;
      }
      if (Notification.permission === "granted") {
        // Already granted — silently subscribe
        subscribeUser();
        return;
      }
      if (Notification.permission === "denied") return;
      setShow(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  async function subscribeUser() {
    try {
      if (!("serviceWorker" in navigator)) return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      const subJson = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
      });
    } catch (err) {
      console.error("Push subscription failed:", err);
    }
  }

  async function enableNotifications() {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setShow(false);
        sessionStorage.setItem("nudge-dismissed", "1");
        await subscribeUser();
      } else {
        setShow(false);
        sessionStorage.setItem("nudge-dismissed", "1");
      }
    } catch {
      setShow(false);
    }
  }

  function dismiss() {
    setShow(false);
    sessionStorage.setItem("nudge-dismissed", "1");
  }

  if (!show) return null;

  // iPhone Safari (not home screen) — show instructions
  if (message === "iphone") {
    return (
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-card border border-accent/30 rounded-xl p-4 shadow-lg z-50">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{"\uD83D\uDD14"}</span>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Want Nudge Notifications?</h3>
            <p className="text-xs text-muted mt-1">
              To get reminders on iPhone:<br />
              1. Tap the <strong>Share</strong> button (square with arrow)<br />
              2. Tap <strong>&quot;Add to Home Screen&quot;</strong><br />
              3. Open Stride from your home screen<br />
              4. The notification prompt will appear
            </p>
            <button onClick={dismiss} className="mt-3 px-3 py-1.5 text-muted text-xs hover:text-foreground">Got it</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-card border border-accent/30 rounded-xl p-4 shadow-lg z-50">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{"\uD83D\uDD14"}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Enable Nudge Notifications</h3>
          <p className="text-xs text-muted mt-1">Get reminded about your goals at the times you set.</p>
          <div className="flex gap-2 mt-3">
            <button onClick={enableNotifications} className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/90">Enable</button>
            <button onClick={dismiss} className="px-3 py-1.5 text-muted text-xs hover:text-foreground">Not now</button>
          </div>
        </div>
      </div>
    </div>
  );
}
