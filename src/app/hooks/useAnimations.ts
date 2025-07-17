'use client';

import { useCallback, useRef } from 'react';
import { SurfData } from '../types/surf';

export function useAnimations() {
  const animationsLoadedRef = useRef(false);

  const initializeAnimations = useCallback(() => {
    if (animationsLoadedRef.current) return;

    // Load swell animation web component
    if (!customElements.get('swell-animation')) {
      const swellScript = document.createElement('script');
      swellScript.textContent = getSwellAnimationCode();
      swellScript.id = 'swell-animation-script';
      document.head.appendChild(swellScript);
    }

    // Load wind animation web component  
    if (!customElements.get('wind-animation')) {
      const windScript = document.createElement('script');
      windScript.textContent = getWindAnimationCode();
      windScript.id = 'wind-animation-script';
      document.head.appendChild(windScript);
    }

    // Load visualization functions
    if (!(window as any).updateWaveHeightVisual) {
      const vizScript = document.createElement('script');
      vizScript.textContent = getVisualizationCode();
      vizScript.id = 'visualization-script';
      document.head.appendChild(vizScript);
    }

    // Load tide visualizer
    if (!(window as any).SmoothTideChart) {
      const tideScript = document.createElement('script');
      tideScript.textContent = getTideVisualizerCode();
      tideScript.id = 'tide-visualizer-script';
      document.head.appendChild(tideScript);
    }

    animationsLoadedRef.current = true;
  }, []);

  const updateVisualizations = useCallback((surfData: SurfData) => {
    // Update wave height background
    const waveHeightBg = document.getElementById('waveHeightBg');
    if (waveHeightBg && (window as any).updateWaveHeightVisual) {
      (window as any).updateWaveHeightVisual(surfData.details.wave_height_ft);
    }

    // Update wind animation
    const windLines = document.getElementById('windLinesContainer');
    if (windLines && (window as any).updateWindVisual) {
      (window as any).updateWindVisual(
        surfData.details.wind_speed_kts, 
        surfData.details.wind_direction_deg
      );
    }

    // Update period animation
    const periodVisual = document.getElementById('periodVisualContainer');
    if (periodVisual && (window as any).updatePeriodVisual) {
      (window as any).updatePeriodVisual(
        surfData.details.wave_period_sec,
        surfData.details.swell_direction_deg
      );
    }

    // Update tide visualization
    const tideVisual = document.getElementById('tideVisualContainer');
    if (tideVisual && (window as any).SmoothTideChart) {
      new (window as any).SmoothTideChart(tideVisual, {
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
  }, []);

  return {
    initializeAnimations,
    updateVisualizations
  };
}

// Animation code functions
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
    
    const windElement = document.createElement('wind-animation');
    
    const normalizedSpeed = Math.min(Math.max(windSpeed, 0), 40);
    const intensity = 0.2 + (normalizedSpeed / 40) * 0.6;
    
    windElement.setAttribute('direction', windDirection);
    windElement.setAttribute('speed', windSpeed);
    windElement.setAttribute('intensity', intensity.toFixed(2));
    
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
        
        this.container.appendChild(this.svg);
    }

    drawChart() {
        const pathData = this.generateSmoothTideCurve();
        
        if (pathData && !pathData.includes('NaN')) {
            const svgHeight = this.height * 9;
            
            const fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            fillPath.setAttribute('fill', 'rgba(255, 255, 255, 0.1)');
            fillPath.setAttribute('d', pathData + \` L1440,\${svgHeight} L0,\${svgHeight} Z\`);
            this.svg.appendChild(fillPath);
            
            const curvePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            curvePath.setAttribute('fill', 'none');
            curvePath.setAttribute('stroke', 'rgba(0, 0, 0, 1)');
            curvePath.setAttribute('stroke-width', '1');
            curvePath.setAttribute('vector-effect', 'non-scaling-stroke');
            curvePath.setAttribute('d', pathData);
            this.svg.appendChild(curvePath);
        } else {
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
        line.setAttribute('stroke', '#000000');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '12,8');
        line.setAttribute('vector-effect', 'non-scaling-stroke');
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
        curvePath.setAttribute('fill', 'none');
        curvePath.setAttribute('stroke', 'rgba(0, 0, 0, 1)');
        curvePath.setAttribute('stroke-width', '1');
        curvePath.setAttribute('vector-effect', 'non-scaling-stroke');
        curvePath.setAttribute('d', path);
        this.svg.appendChild(curvePath);
        
        const fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        fillPath.setAttribute('fill', 'rgba(255, 255, 255, 0.1)');
        fillPath.setAttribute('d', path + \` L\${svgWidth},\${svgHeight} L0,\${svgHeight} Z\`);
        this.svg.appendChild(fillPath);
    }
}

window.SmoothTideChart = SmoothTideChart;
  `;
}