'use client';

import { useState, useEffect } from 'react';
import { useSurfData } from './hooks/useSurfData';
import { useNotifications } from './hooks/useNotifications';
import { WeatherCard } from './components/surf/WeatherCard';
import { SurfDetails } from './components/surf/SurfDetails';
import { TideCard } from './components/surf/TideCard';
import { Toast } from './components/ui/Toast';
import { SkyBackground } from './components/backgrounds/SkyBackground';

export default function Home() {
  const { data, loading, error } = useSurfData();
  const { enabled: notificationsEnabled, toggleNotifications, sendNotification } = useNotifications();
  const [toast, setToast] = useState<string | null>(null);

  // Check for good conditions and send notifications
  useEffect(() => {
    if (data && notificationsEnabled) {
      const isGoodConditions = data.score >= 70 || data.rating.toLowerCase().includes('good');
      if (isGoodConditions) {
        sendNotification(data);
      }
    }
  }, [data, notificationsEnabled, sendNotification]);

  const handleNotificationToggle = async () => {
    const result = await toggleNotifications();
    setToast(result.message);
  };

  return (
    <main >

      {/* Top Controls */}
      <div className="fixed top-0 left-0 right-0 mx-2 sm:mx-4 lg:mx-8 bg-white shadow-md z-50 flex py-4 px-6 mt-5 rounded-full justify-between items-center glass-effect bg-white/40 border-b border-black/10">
        <h1 className="font-light text-xl">SURF LAB</h1>
        {/* <div className="flex gap-2">
          <button
            onClick={handleNotificationToggle}
            className={`notification-bell flex items-center justify-center cursor-pointer min-w-[44px] min-h-[44px] p-2 rounded-full transition-all duration-300 hover:-translate-y-px hover:bg-white/10 focus:outline-none focus:bg-white/10 active:translate-y-0 ${
              notificationsEnabled ? 'enabled' : 'disabled'
            }`}
            title={notificationsEnabled ? 'Disable Notifications' : 'Enable Notifications'}
            aria-label={notificationsEnabled ? 'Notifications enabled' : 'Notifications disabled'}
          >
            <span className={`bell-icon font-emoji text-2xl font-bold leading-none transition-all duration-300 ${
              notificationsEnabled ? 'text-emerald-500' : 'text-black'
            }`}>
              {notificationsEnabled ? '🔔' : '🔕'}
            </span>
          </button>
        </div> */}
      </div>

      {/* Wave Container */}
      {/* <div className="wave-container fixed left-0 right-0 top-0 bottom-0 z-10 pointer-events-none opacity-60 mix-blend-overlay"> */}
        {/* Future: Add full-screen wave animation */}
        {/* <canvas className="w-full h-full block" />
      </div> */}

      {/* Main Container */}
      <div className="container max-w-md mx-auto mb-10 px-5 py-5 relative z-20 min-h-screen mt-[300px] shadow-lg rounded-3xl glass-effect">
        {/* Header */}
        <WeatherCard data={data} loading={loading} />

        {/* Error Display */}
        {error && (
          <div className="error bg-red-500/20 border border-red-500/50 text-red-300 p-5 rounded-2xl my-5 text-center glass-effect font-medium">
            {error}
          </div>
        )}

        {/* Surf Data */}
        <div className={loading && !data ? 'opacity-50' : ''}>
          {/* Details Grid */}
          <SurfDetails data={data} loading={loading} />

          {/* Tide Card */}
          <TideCard data={data} loading={loading} />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast}
          onClose={() => setToast(null)}
        />
      )}
    </main>
  );
}