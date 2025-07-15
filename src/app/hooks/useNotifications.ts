'use client';

import { useState, useEffect } from 'react';

export function useNotifications() {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // Load saved preference
      const saved = localStorage.getItem('surf-notifications-enabled');
      if (saved === 'true' && Notification.permission === 'granted') {
        setEnabled(true);
      }
    }
  }, []);

  const toggleNotifications = async () => {
    if (!('Notification' in window)) {
      return { success: false, message: 'Notifications not supported' };
    }

    if (!enabled) {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        setEnabled(true);
        localStorage.setItem('surf-notifications-enabled', 'true');
        return { success: true, message: 'Notifications enabled!' };
      } else {
        return { success: false, message: 'Permission denied' };
      }
    } else {
      setEnabled(false);
      localStorage.setItem('surf-notifications-enabled', 'false');
      return { success: true, message: 'Notifications disabled' };
    }
  };

  const sendNotification = (data: any) => {
    if (!enabled || permission !== 'granted') return;

    const lastNotification = localStorage.getItem('surf-last-notification');
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (lastNotification && (now - parseInt(lastNotification)) < oneHour) {
      return;
    }

    new Notification('🏄‍♂️ Great Surf Conditions!', {
      body: `${data.location}: ${data.rating} conditions with ${data.details.wave_height_ft}ft waves!`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      tag: 'surf-conditions',
      requireInteraction: false,
    });

    localStorage.setItem('surf-last-notification', now.toString());
  };

  return { enabled, permission, toggleNotifications, sendNotification };
}