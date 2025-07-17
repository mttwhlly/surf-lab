// app/page.tsx - Component with working animations
'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  Sun, 
  CloudSun, 
  Cloud, 
  Cloudy, 
  Droplet,
  CloudFog, 
  CloudRain, 
  CloudSnow, 
  CloudDrizzle, 
  Snowflake, 
  Zap, 
  CloudLightning 
} from 'lucide-react';
import Image from 'next/image';

interface SurfData {
  location: string;
  timestamp: string;
  surfable: boolean;
  rating: string;
  score: number;
  goodSurfDuration: string;
  details: {
    wave_height_ft: number;
    wave_period_sec: number;
    swell_direction_deg: number;
    wind_direction_deg: number;
    wind_speed_kts: number;
    tide_state: string;
    tide_height_ft: number;
    data_source: string;
  };
  weather: {
    air_temperature_f: number;
    water_temperature_f: number;
    weather_code: number;
    weather_description: string;
  };
  tides: {
    current_height_ft: number;
    state: string;
    next_high: { time: string; height: number } | null;
    next_low: { time: string; height: number } | null;
  };
}

export default function SurfApp() {
  const [surfData, setSurfData] = useState<SurfData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for animation containers
  const waveHeightBgRef = useRef<HTMLDivElement>(null);
  const windLinesRef = useRef<HTMLDivElement>(null);
  const periodVisualRef = useRef<HTMLDivElement>(null);
  const tideVisualRef = useRef<HTMLDivElement>(null);

  const API_URL = 'https://c0cgocok00o40c48c40k8g04.mttwhlly.cc/surfability';

  useEffect(() => {
    fetchSurfData();
    
    // Load and initialize animations after component mounts
    loadAnimationScripts();
  }, []);

  useEffect(() => {
    if (surfData && !isLoading) {
      // Update animations with real data
      updateVisualizations();
    }
  }, [surfData, isLoading]);

  const loadAnimationScripts = () => {
    // Load swell animation web component
    if (!customElements.get('swell-animation')) {
      const swellScript = document.createElement('script');
      swellScript.textContent = getSwellAnimationCode();
      document.head.appendChild(swellScript);
    }

    // Load wind animation web component  
    if (!customElements.get('wind-animation')) {
      const windScript = document.createElement('script');
      windScript.textContent = getWindAnimationCode();
      document.head.appendChild(windScript);
    }

    // Load visualization functions
    const vizScript = document.createElement('script');
    vizScript.textContent = getVisualizationCode();
    document.head.appendChild(vizScript);

    // Load tide visualizer
    const tideScript = document.createElement('script');
    tideScript.textContent = getTideVisualizerCode();
    document.head.appendChild(tideScript);
  };

  const updateVisualizations = () => {
    if (!surfData) return;

    // Update wave height background
    if (waveHeightBgRef.current && (window as any).updateWaveHeightVisual) {
      (window as any).updateWaveHeightVisual(surfData.details.wave_height_ft);
    }

    // Update wind animation
    if (windLinesRef.current && (window as any).updateWindVisual) {
      (window as any).updateWindVisual(
        surfData.details.wind_speed_kts, 
        surfData.details.wind_direction_deg
      );
    }

    // Update period animation
    if (periodVisualRef.current && (window as any).updatePeriodVisual) {
      (window as any).updatePeriodVisual(
        surfData.details.wave_period_sec,
        surfData.details.swell_direction_deg
      );
    }

    // Update tide visualization
    if (tideVisualRef.current && (window as any).SmoothTideChart) {
      const tideChart = new (window as any).SmoothTideChart(tideVisualRef.current, {
        current_height_ft: surfData.tides.current_height_ft,
        state: surfData.tides.state,
        tides: {
          next_high: surfData.tides.next_high,
          next_low: surfData.tides.next_low,
          cycle_info: {
            cycle_duration_hours: 12.4,
            range_ft: 4
          }
        }
      });
    }
  };

  const fetchSurfData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSurfData(data);
    } catch (err) {
      console.error('Error fetching surf data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load surf conditions');
    } finally {
      setIsLoading(false);
    }
  };

const getWeatherIcon = (weatherCode: number | null) => {
  if (weatherCode === null || weatherCode === undefined) {
    return <Sun className="w-7 h-7" />;
  }
  
  const iconProps = { className: "w-7 h-7", strokeWidth: 1 };
  
  switch (weatherCode) {
    case 0: return <Sun {...iconProps} />; // Clear sky
    case 1: return <CloudSun {...iconProps} />; // Mainly clear
    case 2: return <Cloud {...iconProps} />; // Partly cloudy
    case 3: return <Cloudy {...iconProps} />; // Overcast
    case 45:
    case 48: return <CloudFog {...iconProps} />; // Fog
    case 51:
    case 53: return <CloudDrizzle {...iconProps} />; // Drizzle
    case 55:
    case 61:
    case 63:
    case 65: return <CloudRain {...iconProps} />; // Rain
    case 56:
    case 57:
    case 66:
    case 67:
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86: return <CloudSnow {...iconProps} />; // Snow
    case 80:
    case 81: return <CloudRain {...iconProps} />; // Rain showers
    case 82: return <CloudLightning {...iconProps} />; // Heavy rain
    case 95:
    case 96:
    case 99: return <Zap {...iconProps} />; // Thunderstorm
    default: return <CloudSun {...iconProps} />;
  }
};

  const getCompassDirection = (degrees: number) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const createDirectionArrow = (degrees: number) => {
    const rotationDegrees = degrees + 90;
    return (
      <span 
        className="direction-arrow inline-block ml-1.5 text-black font-semibold"
        style={{ transform: `rotate(${rotationDegrees}deg)` }}
        title={`From ${getCompassDirection((degrees + 180) % 360)} (${degrees}°)`}
      >
        →
      </span>
    );
  };

  return (
    <div className='pb-20'>
      {/* Top Controls */}
      <div className="fixed top-0 left-0 right-0 mx-2 sm:mx-4 lg:mx-8 shadow-md z-50 flex p-4 mt-5 rounded-full justify-between items-center  bg-white/80 backdrop-blur-xs border-b border-black/10">
        <Image 
          src="/wave-logo.svg"
          alt="Surf Lab Logo"
          width={120}
          height={40}
          className="h-8 w-auto"
          />
          {/* <h1 className="font-light text-xl">SURF LAB</h1> */}
      </div>

      {/* Main Container */}
      <div className="max-w-md mx-auto mb-10 px-5 py-5 relative z-20 min-h-screen mt-[300px] shadow-lg rounded-3xl glass-effect">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`text-2xl font-semibold mt-2 mb-6 ${isLoading ? 'relative loading-shimmer' : ''}`}>
            {surfData?.location || 'St. Augustine, FL'}
            {isLoading && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
            )}
          </div>
          <div className="temp-item">
            <div className="temp-value flex justify-center items-center text-2xl font-semibold">
              <div className={`weather-icon mr-4 ${isLoading ? 'relative loading-shimmer' : ''}`}>
                {isLoading ? <Sun className="w-7 h-7 opacity-50" strokeWidth={1} /> : getWeatherIcon(surfData?.weather.weather_code || null)}
                {isLoading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
                )}
              </div>
              <div className={`${isLoading ? 'relative loading-shimmer' : ''}`}>
                <span>{isLoading ? '--' : Math.round(surfData?.weather.air_temperature_f || 0)}</span>
                {isLoading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
                )}
              </div>
              <span className="temp-unit text-base opacity-70 ml-1">°F</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error bg-red-500/20 border border-red-500/50 text-red-300 p-5 rounded-2xl my-5 text-center font-medium">
            {error}
          </div>
        )}

        {/* Surf Data */}
        <div className={isLoading ? 'opacity-50' : ''}>
          {/* Details Grid */}
            <div className="details-grid grid grid-cols-2 gap-4">
            {/* Wave Height Card */}
            <div className="bg-white/40 border-none relative overflow-hidden transition-transform duration-200 rounded-2xl p-5 text-center hover:scale-105 aspect-square flex flex-col justify-center">
              <div 
                ref={waveHeightBgRef}
                className="detail-visual-bg absolute inset-0 pointer-events-none"
                id="waveHeightBg"
              ></div>
              <div className="detail-label text-xs uppercase tracking-wider opacity-80 mb-2 font-semibold relative z-10">Wave Height</div>
              <div className={`${isLoading ? 'relative loading-shimmer' : ''}`}>
                <div className="text-2xl font-semibold flex items-center justify-center gap-1 relative z-10">
                  {isLoading ? '--' : `${surfData?.details.wave_height_ft || '--'} ft`}
                </div>
                {isLoading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
                )}
              </div>
            </div>
            
            {/* Period Card */}
            <div className="bg-white/40 border-none relative overflow-hidden transition-transform duration-200 rounded-2xl p-5 text-center hover:scale-105 aspect-square flex flex-col justify-center">
              <div 
                ref={periodVisualRef}
                className="period-visual-container absolute inset-0 overflow-hidden pointer-events-none"
                id="periodVisualContainer"
              ></div>
              <div className="detail-label text-xs uppercase tracking-wider opacity-80 mb-2 font-semibold relative z-10">Period</div>
              <div className={`${isLoading ? 'relative loading-shimmer' : ''}`}>
                <div className="text-2xl font-semibold flex items-center justify-center gap-1 relative z-10">
                  {isLoading ? '--' : (
                    <>
                      {surfData?.details.wave_period_sec || '--'} s
                      {surfData?.details.swell_direction_deg && createDirectionArrow(surfData.details.swell_direction_deg)}
                    </>
                  )}
                </div>
                {isLoading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
                )}
              </div>
            </div>
            
            {/* Wind Speed Card */}
            <div className="bg-white/40 border-none relative overflow-hidden transition-transform duration-200 rounded-2xl p-5 text-center hover:scale-105 aspect-square flex flex-col justify-center">
              <div 
                ref={windLinesRef}
                className="wind-lines-container absolute inset-0 overflow-hidden pointer-events-none"
                id="windLinesContainer"
              ></div>
              <div className="detail-label text-xs uppercase tracking-wider opacity-80 mb-2 font-semibold relative z-10">Wind Speed</div>
              <div className={`${isLoading ? 'relative loading-shimmer' : ''}`}>
                <div className="text-2xl font-semibold flex items-center justify-center gap-1 relative z-10">
                  {isLoading ? '--' : (
                    <>
                      {Math.round(surfData?.details.wind_speed_kts || 0)} kts
                      {surfData?.details.wind_direction_deg && createDirectionArrow(surfData.details.wind_direction_deg)}
                    </>
                  )}
                </div>
                {isLoading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
                )}
              </div>
            </div>
            
            {/* Water Temperature Card */}
            <div className="bg-white/40 border-none relative overflow-hidden transition-transform duration-200 rounded-2xl p-5 text-center hover:scale-105 aspect-square flex flex-col justify-center">
              <div className="detail-label text-xs uppercase tracking-wider opacity-80 mb-2 font-semibold relative z-10">Water</div>
              <div className={`${isLoading ? 'relative loading-shimmer' : ''}`}>
                <div className="text-2xl font-semibold flex items-center justify-center gap-1 relative z-10">
                  <Droplet strokeWidth={1} />
                  {isLoading ? '--' : Math.round(surfData?.weather.water_temperature_f || 0)}
                  <span className="temp-unit text-base opacity-70 ml-1">°F</span>
                </div>
                {isLoading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
                )}
              </div>
            </div>
          </div>

          {/* Tide Card */}
          <div className="bg-white/40 border-none relative overflow-hidden transition-transform duration-200 rounded-3xl p-5">
            <div className="tide-header flex items-center justify-center gap-3 relative z-10">
              <div className="tide-title text-xs uppercase tracking-wider opacity-80 mb-2 font-semibold">Tide</div>
            </div>
            
            <div className="tide-current text-center mb-4 relative z-10">
              <div className={`${isLoading ? 'relative loading-shimmer' : ''}`}>
                <div className="tide-height text-2xl font-semibold mb-1">
                  {isLoading ? '--' : surfData?.tides.current_height_ft || '--'} ft
                </div>
                {isLoading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
                )}
              </div>
              <div className={`${isLoading ? 'relative loading-shimmer' : ''}`}>
                <div className="tide-state text-sm uppercase tracking-wider opacity-80 font-medium">
                  {isLoading ? 'Loading' : surfData?.tides.state || 'Unknown'}
                </div>
                {isLoading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
                )}
              </div>
            </div>
            
            <div 
              ref={tideVisualRef}
              className="tide-visual-container relative h-32 my-4 bg-white/5 rounded-2xl overflow-hidden border border-white/10"
            >
              {/* Tide chart will be rendered here by JavaScript */}
            </div>
            
            <div className="tide-predictions grid grid-cols-2 gap-4 relative z-10">
              <div className="tide-prediction text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="tide-prediction-label text-xs uppercase tracking-wider opacity-80 mb-1 font-semibold">Next High</div>
                <div className={`${isLoading ? 'relative loading-shimmer' : ''}`}>
                  <div className="tide-prediction-time text-base font-semibold mb-1">
                    {isLoading ? '--' : surfData?.tides.next_high?.time || '--'}
                  </div>
                  {isLoading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
                  )}
                </div>
                <div className={`${isLoading ? 'relative loading-shimmer' : ''}`}>
                  <div className="tide-prediction-height text-sm opacity-80">
                    {isLoading ? '-- ft' : `${surfData?.tides.next_high?.height || '--'} ft`}
                  </div>
                  {isLoading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
                  )}
                </div>
              </div>
              <div className="tide-prediction text-center p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="tide-prediction-label text-xs uppercase tracking-wider opacity-80 mb-1 font-semibold">Next Low</div>
                <div className={`${isLoading ? 'relative loading-shimmer' : ''}`}>
                  <div className="tide-prediction-time text-base font-semibold mb-1">
                    {isLoading ? '--' : surfData?.tides.next_low?.time || '--'}
                  </div>
                  {isLoading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
                  )}
                </div>
                <div className={`${isLoading ? 'relative loading-shimmer' : ''}`}>
                  <div className="tide-prediction-height text-sm opacity-80">
                    {isLoading ? '-- ft' : `${surfData?.tides.next_low?.height || '--'} ft`}
                  </div>
                  {isLoading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Animation code functions (these will be injected as scripts)
function getSwellAnimationCode() {
  return `
// Enhanced Swell Animation Web Component for SURF LAB
class SwellAnimation extends HTMLElement {
  constructor() {
    super();
    this.canvas = null;
    this.ctx = null;
    this.lines = [];
    this.angleRad = 0;
    this.speed = 1;
    this.spacing = 5000;
    this.timeSinceLastLine = 0;
    this.animationId = null;
    this.isAnimating = false;

    this.animate = this.animate.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  static get observedAttributes() {
    return ["direction", "speed", "period", "width", "height", "intensity"];
  }

  connectedCallback() {
    this.createCanvas();
    this.updateFromAttributes();
    this.startAnimation();
    window.addEventListener("resize", this.handleResize);
  }

  disconnectedCallback() {
    this.stopAnimation();
    window.removeEventListener("resize", this.handleResize);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.updateFromAttributes();
      if (name === "width" || name === "height") {
        this.resizeCanvas();
      }
    }
  }

  createCanvas() {
    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.borderRadius = "15px";
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.pointerEvents = "none";
    this.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.resizeCanvas();
  }

  updateFromAttributes() {
    const direction = parseFloat(this.getAttribute("direction")) || 90;
    const speed = parseFloat(this.getAttribute("speed")) || 1;
    const period = parseFloat(this.getAttribute("period")) || 8;
    const intensity = parseFloat(this.getAttribute("intensity")) || 0.3;

    this.angleRad = ((direction + 90) * Math.PI) / 180;

    const maxDimension = Math.max(
      this.canvas?.width || 200,
      this.canvas?.height || 100
    );
    
    this.speed = (maxDimension / period / 30) * speed * 0.5;
    this.spacing = Math.max(period * 800, 2000);
    this.intensity = Math.min(Math.max(intensity, 0.1), 0.8);

    this.lines = [];
    this.timeSinceLastLine = 0;
    this.createLineAtOffset(0);
  }

  resizeCanvas() {
    if (!this.canvas) return;

    const rect = this.getBoundingClientRect();
    const width = rect.width || 200;
    const height = rect.height || 100;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.scale(dpr, dpr);

    this.canvasWidth = width;
    this.canvasHeight = height;

    this.updateFromAttributes();
  }

  handleResize() {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.resizeCanvas();
    }, 100);
  }

  createLineAtOffset(offsetMultiplier = 1) {
    if (!this.canvas) return;

    const margin = Math.max(this.canvasWidth || 200, this.canvasHeight || 100);
    const centerX = (this.canvasWidth || 200) / 2;
    const centerY = (this.canvasHeight || 100) / 2;

    const offsetX = Math.cos(this.angleRad + Math.PI) * margin * offsetMultiplier;
    const offsetY = Math.sin(this.angleRad + Math.PI) * margin * offsetMultiplier;

    this.lines.push({
      x: centerX + offsetX,
      y: centerY + offsetY,
      opacity: this.intensity
    });
  }

  animate(timestamp) {
    if (!this.isAnimating || !this.ctx) return;

    const width = this.canvasWidth || 200;
    const height = this.canvasHeight || 100;

    this.ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      
      const lineLength = Math.min(width, height) * 1.5;
      const dx = Math.cos(this.angleRad + Math.PI / 2) * lineLength;
      const dy = Math.sin(this.angleRad + Math.PI / 2) * lineLength;

      const fadeDistance = Math.max(width, height) * 0.7;
      const distanceFromCenter = Math.sqrt(
        Math.pow(line.x - width / 2, 2) + Math.pow(line.y - height / 2, 2)
      );
      const fadeFactor = Math.max(0, 1 - (distanceFromCenter / fadeDistance));
      const opacity = line.opacity * fadeFactor;

      this.ctx.strokeStyle = \`rgba(0, 0, 0, 1)\`;
      this.ctx.lineWidth = 1;
      this.ctx.lineCap = "round";

      this.ctx.beginPath();
      this.ctx.moveTo(line.x - dx, line.y - dy);
      this.ctx.lineTo(line.x + dx, line.y + dy);
      this.ctx.stroke();

      line.x += Math.cos(this.angleRad) * this.speed;
      line.y += Math.sin(this.angleRad) * this.speed;
    }

    const margin = Math.max(width, height);
    this.lines = this.lines.filter(
      (line) =>
        line.x >= -margin &&
        line.x <= width + margin &&
        line.y >= -margin &&
        line.y <= height + margin
    );

    if (!this.animate.lastTime) this.animate.lastTime = timestamp;
    const delta = timestamp - this.animate.lastTime;
    this.timeSinceLastLine += delta;

    while (this.timeSinceLastLine >= this.spacing && this.lines.length < 10) {
      this.createLineAtOffset(1);
      this.timeSinceLastLine -= this.spacing;
    }

    this.animate.lastTime = timestamp;
    this.animationId = requestAnimationFrame(this.animate);
  }

  startAnimation() {
    if (!this.isAnimating) {
      this.isAnimating = true;
      this.animationId = requestAnimationFrame(this.animate);
    }
  }

  stopAnimation() {
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  updateSwell(direction, period, intensity = 0.3) {
    this.setAttribute("direction", direction);
    this.setAttribute("period", period);
    this.setAttribute("intensity", intensity);
  }
}

customElements.define("swell-animation", SwellAnimation);
  `;
}

function getWindAnimationCode() {
  return `
// Wind Animation Web Component for SURF LAB
class WindAnimation extends HTMLElement {
  constructor() {
    super();
    this.canvas = null;
    this.ctx = null;
    this.lines = [];
    this.angleRad = 0;
    this.speed = 1;
    this.spacing = 3000;
    this.timeSinceLastLine = 0;
    this.animationId = null;
    this.isAnimating = false;

    this.animate = this.animate.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  static get observedAttributes() {
    return ["direction", "speed", "intensity"];
  }

  connectedCallback() {
    this.createCanvas();
    this.updateFromAttributes();
    this.startAnimation();
    window.addEventListener("resize", this.handleResize);
  }

  disconnectedCallback() {
    this.stopAnimation();
    window.removeEventListener("resize", this.handleResize);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.updateFromAttributes();
    }
  }

  createCanvas() {
    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.borderRadius = "15px";
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.pointerEvents = "none";
    this.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.resizeCanvas();
  }

  updateFromAttributes() {
    const direction = parseFloat(this.getAttribute("direction")) || 0;
    const speed = parseFloat(this.getAttribute("speed")) || 5;
    const intensity = parseFloat(this.getAttribute("intensity")) || 0.3;

    this.angleRad = ((direction + 90) * Math.PI) / 180;

    const maxDimension = Math.max(
      this.canvas?.width || 200,
      this.canvas?.height || 100
    );
    
    this.speed = (maxDimension / 20) * (speed / 10) * 0.8;
    this.spacing = Math.max(3000 - (speed * 80), 1000);
    this.intensity = Math.min(Math.max(intensity, 0.1), 0.8);

    this.lines = [];
    this.timeSinceLastLine = 0;
    this.createLineAtOffset(0);
  }

  resizeCanvas() {
    if (!this.canvas) return;

    const rect = this.getBoundingClientRect();
    const width = rect.width || 200;
    const height = rect.height || 100;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.scale(dpr, dpr);

    this.canvasWidth = width;
    this.canvasHeight = height;

    this.updateFromAttributes();
  }

  handleResize() {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.resizeCanvas();
    }, 100);
  }

  createLineAtOffset(offsetMultiplier = 1) {
    if (!this.canvas) return;

    const margin = Math.max(this.canvasWidth || 200, this.canvasHeight || 100);
    const centerX = (this.canvasWidth || 200) / 2;
    const centerY = (this.canvasHeight || 100) / 2;

    const offsetX = Math.cos(this.angleRad + Math.PI) * margin * offsetMultiplier;
    const offsetY = Math.sin(this.angleRad + Math.PI) * margin * offsetMultiplier;

    this.lines.push({
      x: centerX + offsetX,
      y: centerY + offsetY,
      opacity: this.intensity
    });
  }

  animate(timestamp) {
    if (!this.isAnimating || !this.ctx) return;

    const width = this.canvasWidth || 200;
    const height = this.canvasHeight || 100;

    this.ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      
      const lineLength = Math.min(width, height) * 1.2;
      const dx = Math.cos(this.angleRad + Math.PI / 2) * lineLength;
      const dy = Math.sin(this.angleRad + Math.PI / 2) * lineLength;

      const fadeDistance = Math.max(width, height) * 0.6;
      const distanceFromCenter = Math.sqrt(
        Math.pow(line.x - width / 2, 2) + Math.pow(line.y - height / 2, 2)
      );
      const fadeFactor = Math.max(0, 1 - (distanceFromCenter / fadeDistance));
      const opacity = line.opacity * fadeFactor;

      this.ctx.strokeStyle = \`rgba(0, 0, 0, 1)\`;
      this.ctx.lineWidth = 1;
      this.ctx.lineCap = "round";

      this.ctx.beginPath();
      this.ctx.moveTo(line.x - dx, line.y - dy);
      this.ctx.lineTo(line.x + dx, line.y + dy);
      this.ctx.stroke();

      line.x += Math.cos(this.angleRad) * this.speed;
      line.y += Math.sin(this.angleRad) * this.speed;
    }

    const margin = Math.max(width, height);
    this.lines = this.lines.filter(
      (line) =>
        line.x >= -margin &&
        line.x <= width + margin &&
        line.y >= -margin &&
        line.y <= height + margin
    );

    if (!this.animate.lastTime) this.animate.lastTime = timestamp;
    const delta = timestamp - this.animate.lastTime;
    this.timeSinceLastLine += delta;

    while (this.timeSinceLastLine >= this.spacing && this.lines.length < 8) {
      this.createLineAtOffset(1);
      this.timeSinceLastLine -= this.spacing;
    }

    this.animate.lastTime = timestamp;
    this.animationId = requestAnimationFrame(this.animate);
  }

  startAnimation() {
    if (!this.isAnimating) {
      this.isAnimating = true;
      this.animationId = requestAnimationFrame(this.animate);
    }
  }

  stopAnimation() {
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  updateWind(direction, speed, intensity = 0.3) {
    this.setAttribute("direction", direction);
    this.setAttribute("speed", speed);
    this.setAttribute("intensity", intensity);
  }
}

customElements.define("wind-animation", WindAnimation);
  `;
}

function getVisualizationCode() {
  return `
// Wave Height Visualizer with solid color
function updateWaveHeightVisual(waveHeight) {
    const waveHeightBg = document.getElementById('waveHeightBg');
    if (!waveHeightBg) return;
    
    const minHeight = 0.5;
    const maxHeight = 12;
    
    const percentage = Math.min(Math.max((waveHeight - minHeight) / (maxHeight - minHeight), 0), 1);
    
    const color = '0, 0, 0';
    const opacity = 0.1 + (percentage * 0.4);
    
    const fillHeight = Math.max(10, percentage * 100);
    waveHeightBg.style.background = \`
        linear-gradient(to bottom, 
            transparent 0%, 
            transparent calc(\${100 - fillHeight}% - 0.5px), 
            rgba(0, 0, 0, 1) calc(\${100 - fillHeight}% - 0.5px), 
            rgba(0, 0, 0, 1) calc(\${100 - fillHeight}% + 0.5px), 
            transparent calc(\${100 - fillHeight}% + 0.5px), 
            transparent 100%)
    \`;
}

// Wind Speed Visualizer using Wind Animation Web Component
function updateWindVisual(windSpeed, windDirection) {
    const container = document.getElementById('windLinesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const existingWindStyles = document.querySelectorAll('style[data-animation^="windFlow_"]');
    existingWindStyles.forEach(style => style.remove());
    
    const windElement = document.createElement('wind-animation');
    
    const normalizedSpeed = Math.min(Math.max(windSpeed, 0), 40);
    const intensity = 0.2 + (normalizedSpeed / 40) * 0.6;
    
    const animationStyle = windSpeed > 15 ? "streamlines" : "particles";
    
    windElement.setAttribute('direction', windDirection);
    windElement.setAttribute('speed', windSpeed);
    windElement.setAttribute('intensity', intensity.toFixed(2));
    windElement.setAttribute('style', animationStyle);
    
    windElement.style.cssText = \`
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
    \`;
    
    container.appendChild(windElement);
    container._windAnimation = windElement;
}

// Wave Period Visualizer using Swell Animation Web Component
function updatePeriodVisual(period, swellDirection) {
    const container = document.getElementById('periodVisualContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const existingPeriodStyles = document.querySelectorAll('style[data-animation^="periodFlow_"]');
    existingPeriodStyles.forEach(style => style.remove());
    
    const swellElement = document.createElement('swell-animation');
    
    const normalizedPeriod = Math.min(Math.max(period, 3), 20);
    const intensity = 0.15 + ((normalizedPeriod - 3) / 17) * 0.25;
    
    swellElement.setAttribute('direction', swellDirection);
    swellElement.setAttribute('period', period);
    swellElement.setAttribute('speed', '1');
    swellElement.setAttribute('intensity', intensity.toFixed(2));
    
    swellElement.style.cssText = \`
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
    \`;
    
    container.appendChild(swellElement);
    container._swellAnimation = swellElement;
}

// Make functions globally available
window.updateWaveHeightVisual = updateWaveHeightVisual;
window.updateWindVisual = updateWindVisual;
window.updatePeriodVisual = updatePeriodVisual;
  `;
}

function getTideVisualizerCode() {
  return `
class SmoothTideChart {
    constructor(container, tideData) {
        this.container = container;
        this.tideData = tideData || {};
        this.svg = null;
        this.width = 360;
        this.height = 120;
        
        this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        console.log('🌊 SmoothTideChart initialized');
        this.init();
    }

    init() {
        this.createSVG();
        this.drawChart();
    }

    createSVG() {
        this.container.innerHTML = '';
        
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        this.svg.setAttribute('viewBox', \`0 0 1440 \${this.height * 9}\`);
        this.svg.setAttribute('class', 'tide-chart-svg');
        this.svg.setAttribute('preserveAspectRatio', 'none');
        
        if (this.isSafari) {
            this.svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            this.svg.setAttribute('version', '1.1');
            this.svg.style.display = 'block';
            this.svg.style.width = '100%';
            this.svg.style.height = '100%';
            this.svg.style.position = 'absolute';
            this.svg.style.top = '0';
            this.svg.style.left = '0';
        }
        
        const style = document.createElement('style');
        style.textContent = \`
            .tide-chart-svg {
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.05);
                display: block !important;
                width: 100% !important;
                height: 100% !important;
            }
            .tide-curve {
                fill: none;
                stroke: rgba(0, 0, 0, 1);
                stroke-width: 1;
                stroke-linecap: round;
                vector-effect: non-scaling-stroke;
            }
            .tide-fill {
                fill: rgba(255, 255, 255, 0.1);
                stroke: none;
            }
            .current-time-line {
                stroke: #000000;
                stroke-width: 1;
                stroke-dasharray: 12,8;
                vector-effect: non-scaling-stroke;
            }
        \`;
        
        this.svg.appendChild(style);
        this.container.appendChild(this.svg);
    }

    drawChart() {
        const style = this.svg.querySelector('style');
        this.svg.innerHTML = '';
        this.svg.appendChild(style);
        
        const pathData = this.generateSmoothTideCurve();
        
        if (pathData && !pathData.includes('NaN')) {
            const svgHeight = this.height * 9;
            
            const fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            fillPath.setAttribute('class', 'tide-fill');
            fillPath.setAttribute('d', pathData + \` L1440,\${svgHeight} L0,\${svgHeight} Z\`);
            this.svg.appendChild(fillPath);
            
            const curvePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            curvePath.setAttribute('class', 'tide-curve');
            curvePath.setAttribute('d', pathData);
            this.svg.appendChild(curvePath);
            
            console.log('✅ Smooth tide chart drawn successfully');
        } else {
            console.warn('🌊 Using fallback chart');
            this.drawFallbackChart();
        }
        
        this.drawCurrentTimeIndicator();
    }

    generateSmoothTideCurve() {
        const svgWidth = 1440;
        const svgHeight = this.height * 9;
        const verticalCenter = svgHeight / 2;
        
        const tideParams = this.calculateTideParameters();
        
        let path = '';
        
        for (let x = 0; x <= svgWidth; x += 2) {
            const timeInHours = x / 60;
            const height = this.calculateTideHeight(timeInHours, tideParams);
            
            const y = this.heightToSVG(height, verticalCenter, tideParams);
            
            if (x === 0) {
                path = \`M \${x} \${y.toFixed(1)}\`;
            } else {
                path += \` L \${x} \${y.toFixed(1)}\`;
            }
        }
        
        return path;
    }

    calculateTideParameters() {
        const now = new Date();
        const currentHour = now.getHours() + now.getMinutes() / 60;
        const currentHeight = this.tideData.current_height_ft || 2.0;
        
        let highHeight = 4.0;
        let lowHeight = 0.5;
        
        const tides = this.tideData.tides;
        if (tides) {
            if (tides.next_high?.height) highHeight = tides.next_high.height;
            if (tides.next_low?.height) lowHeight = tides.next_low.height;
        }
        
        const amplitude = (highHeight - lowHeight) / 2;
        const midHeight = (highHeight + lowHeight) / 2;
        
        let phaseShift = 0;
        
        if (this.tideData.state) {
            const state = this.tideData.state.toLowerCase();
            
            if (state.includes('high')) {
                phaseShift = Math.PI / 2;
            } else if (state.includes('low')) {
                phaseShift = -Math.PI / 2;
            } else if (state.includes('rising') || state.includes('flood')) {
                const normalizedHeight = (currentHeight - midHeight) / amplitude;
                phaseShift = Math.asin(Math.max(-1, Math.min(1, normalizedHeight)));
            } else if (state.includes('falling') || state.includes('ebb')) {
                const normalizedHeight = (currentHeight - midHeight) / amplitude;
                phaseShift = Math.PI - Math.asin(Math.max(-1, Math.min(1, normalizedHeight)));
            } else {
                const normalizedHeight = (currentHeight - midHeight) / amplitude;
                phaseShift = Math.asin(Math.max(-1, Math.min(1, normalizedHeight)));
            }
        }
        
        const currentPhase = (currentHour * Math.PI) / 6.2;
        phaseShift = phaseShift - currentPhase;
        
        return {
            amplitude,
            midHeight,
            phaseShift,
            period: 12.4,
            currentHeight,
            highHeight,
            lowHeight
        };
    }

    calculateTideHeight(timeInHours, params) {
        const phase = (timeInHours * 2 * Math.PI) / params.period + params.phaseShift;
        return params.midHeight + params.amplitude * Math.sin(phase);
    }

    heightToSVG(tideHeight, verticalCenter, params) {
        const svgHeight = this.height * 9;
        const maxAmplitude = svgHeight * 0.35;
        
        const normalizedHeight = (tideHeight - params.midHeight) / params.amplitude;
        return verticalCenter - (normalizedHeight * maxAmplitude);
    }

    drawCurrentTimeIndicator() {
        const svgHeight = this.height * 9;
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'current-time-line');
        line.setAttribute('x1', currentMinutes);
        line.setAttribute('y1', 0);
        line.setAttribute('x2', currentMinutes);
        line.setAttribute('y2', svgHeight);
        this.svg.appendChild(line);
    }

    drawFallbackChart() {
        const svgHeight = this.height * 9;
        const svgWidth = 1440;
        const verticalCenter = svgHeight / 2;
        const amplitude = svgHeight * 0.3;
        
        let path = \`M 0 \${verticalCenter}\`;
        
        for (let x = 0; x <= svgWidth; x += 3) {
            const y = verticalCenter + amplitude * Math.sin((x / svgWidth) * Math.PI * 4 - Math.PI);
            path += \` L \${x} \${y.toFixed(1)}\`;
        }
        
        const curvePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        curvePath.setAttribute('class', 'tide-curve');
        curvePath.setAttribute('d', path);
        this.svg.appendChild(curvePath);
        
        const fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        fillPath.setAttribute('class', 'tide-fill');
        fillPath.setAttribute('d', path + \` L\${svgWidth},\${svgHeight} L0,\${svgHeight} Z\`);
        this.svg.appendChild(fillPath);
    }
}

window.SmoothTideChart = SmoothTideChart;
  `;
}