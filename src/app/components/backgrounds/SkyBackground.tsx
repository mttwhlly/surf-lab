'use client';

import { useEffect } from 'react';

interface SkyBackgroundProps {
  weatherCode?: number;
  className?: string;
}

export function SkyBackground({ weatherCode, className = '' }: SkyBackgroundProps) {
  useEffect(() => {
    const updateBackground = () => {
      const now = new Date();
      const hour = now.getHours();
      
      // Time-based gradients
      const timeGradients: { [key: string]: string } = {
        'pre-dawn': 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 25%, #2d2d44 50%, #1a1a2e 75%, #0f0f23 100%)',
        'sunrise': 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 25%, #ffb6c1 50%, #87ceeb 75%, #4682b4 100%)',
        'morning': 'linear-gradient(135deg, #87ceeb 0%, #b0e0e6 25%, #ffd700 50%, #87ceeb 75%, #4682b4 100%)',
        'midday': 'linear-gradient(135deg, #4682b4 0%, #87ceeb 25%, #b0e0e6 50%, #87ceeb 75%, #4682b4 100%)',
        'afternoon': 'linear-gradient(135deg, #87ceeb 0%, #ffa500 25%, #ffb6c1 50%, #87ceeb 75%, #4682b4 100%)',
        'sunset': 'linear-gradient(135deg, #dc143c 0%, #ff4500 25%, #ff69b4 50%, #8b008b 75%, #4682b4 100%)',
        'dusk': 'linear-gradient(135deg, #4b0082 0%, #8b008b 25%, #ff69b4 50%, #8b008b 75%, #191970 100%)',
        'night': 'linear-gradient(135deg, #000080 0%, #191970 25%, #2f2f4f 50%, #191970 75%, #000000 100%)',
      };

      // Weather-based overrides
      const weatherGradients: { [key: number]: string } = {
        3: 'linear-gradient(135deg, #696969 0%, #708090 25%, #a9a9a9 50%, #696969 75%, #2f4f4f 100%)', // Overcast
        45: 'linear-gradient(135deg, #f5f5f5 0%, #e6e6fa 25%, #d3d3d3 50%, #f5f5f5 75%, #dcdcdc 100%)', // Fog
        61: 'linear-gradient(135deg, #708090 0%, #b0c4de 25%, #87ceeb 50%, #708090 75%, #2f4f4f 100%)', // Rain
        95: 'linear-gradient(135deg, #000000 0%, #1a1a1a 25%, #2f2f2f 50%, #1a1a1a 75%, #000000 100%)', // Thunderstorm
      };

      let gradient = timeGradients.midday; // Default

      // Check weather override
      if (weatherCode && weatherGradients[weatherCode]) {
        gradient = weatherGradients[weatherCode];
      } else {
        // Time-based gradient
        if (hour >= 4 && hour < 6) gradient = timeGradients['pre-dawn'];
        else if (hour >= 6 && hour < 8) gradient = timeGradients.sunrise;
        else if (hour >= 8 && hour < 12) gradient = timeGradients.morning;
        else if (hour >= 12 && hour < 17) gradient = timeGradients.midday;
        else if (hour >= 17 && hour < 19) gradient = timeGradients.afternoon;
        else if (hour >= 19 && hour < 20) gradient = timeGradients.sunset;
        else if (hour >= 20 && hour < 22) gradient = timeGradients.dusk;
        else gradient = timeGradients.night;
      }

      // Apply gradient to body
      document.body.style.background = gradient;
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.backgroundSize = '400% 400%';
      
      // Add theme classes
      const lightTimes = [8, 9, 10, 11, 12, 13, 14, 15, 16];
      const isDark = !lightTimes.includes(hour) || (weatherCode && [3, 95].includes(weatherCode));
      
      document.body.classList.toggle('dark-gradient', isDark);
      document.body.classList.toggle('light-gradient', !isDark);
    };

    updateBackground();
    
    // Update every 5 minutes
    const interval = setInterval(updateBackground, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [weatherCode]);

  return null; // This component only applies styles to body
}