import { serve } from "bun"
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

const surfReportSchema = z.object({
  conditionsAnalysis: z.string().min(120).describe("First paragraph: Current wave, wind, and tide conditions with analysis"),
  recommendationsAndOutlook: z.string().min(100).describe("Second paragraph: Spot recommendations, gear advice, and bottom line"),

  recommendations: z.object({
    boardType: z.string().describe("General board type recommendation (longboard, shortboard, funboard) - NO specific sizes"),
    wetsuitThickness: z.string().optional().describe("Wetsuit recommendation"),
    skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).describe("Recommended skill level"),
    bestSpots: z.array(z.string()).min(2).describe("Top 2-3 spot recommendations"),
    timingAdvice: z.string().describe("When to surf — or when to check back if conditions are not currently viable")
  })
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
}

function corsResponse() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

// Approximate sunrise/sunset for St. Augustine, FL (30°N) in Eastern local time (decimal hours).
// Accounts for DST: EDT months use DST-adjusted values.
const SURF_WINDOW: [number, number][] = [
  [7.25, 17.65], // Jan
  [7.05, 18.15], // Feb
  [7.45, 19.6],  // Mar (DST mid-month, averaged)
  [6.75, 19.9],  // Apr
  [6.4,  20.25], // May
  [6.35, 20.5],  // Jun
  [6.5,  20.4],  // Jul
  [6.85, 20.05], // Aug
  [7.1,  19.35], // Sep
  [7.35, 18.65], // Oct
  [6.75, 17.85], // Nov (DST ends early month, averaged)
  [7.1,  17.55], // Dec
]

function getEasternTime(): { hour: number, month: number, formatted: string } {
  const now = new Date()
  const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hour = eastern.getHours() + eastern.getMinutes() / 60
  const month = eastern.getMonth()
  const formatted = eastern.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return { hour, month, formatted }
}

function getSurfWindow(month: number): { rise: number, set: number } {
  const [rise, set] = SURF_WINDOW[month]!
  return { rise, set }
}

type SessionViability =
  | { viable: true }
  | { viable: false, reason: 'night', riseStr: string }
  | { viable: false, reason: 'lightning' }

function getSessionViability(hour: number, month: number, weatherDescription: string): SessionViability {
  if (/thunder|lightning|tropical storm|hurricane/i.test(weatherDescription)) {
    return { viable: false, reason: 'lightning' }
  }
  const { rise, set } = getSurfWindow(month)
  if (hour < rise || hour >= set) {
    const riseH = Math.floor(rise)
    const riseM = Math.round((rise % 1) * 60)
    const riseStr = `${riseH}:${riseM.toString().padStart(2, '0')} AM`
    return { viable: false, reason: 'night', riseStr }
  }
  return { viable: true }
}

function getCompassDirection(degrees: number): string {
  const directions = ['North', 'NNE', 'NE', 'ENE', 'East', 'ESE', 'SE', 'SSE',
                     'South', 'SSW', 'SW', 'WSW', 'West', 'WNW', 'NW', 'NNW']
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}

function getWaveQuality(height: number, period: number): string {
  if (period >= 12) return 'Quality groundswell with good power and long rides.'
  if (period >= 8) return 'Decent swell with moderate power and rideable waves.'
  if (period >= 6) return 'Short period wind swell — waves will be quick and choppy.'
  return 'Very short period — expect weak, mushy waves.'
}

function getTideContext(tideState: string): string {
  if (tideState.includes('Rising')) return 'Rising tide usually brings cleaner waves and better shape.'
  if (tideState.includes('Falling')) return 'Falling tide can expose more sandbars but may get shallower.'
  if (tideState.includes('High')) return 'High tide offers deeper water but waves may be mushier.'
  if (tideState.includes('Low')) return 'Low tide exposes sandbars — watch for shallow sections.'
  return 'Mid tide typically offers the most consistent conditions.'
}

function getBoardTypeRecommendation(waveHeight: number): string {
  if (waveHeight >= 4) return 'Shortboard recommended'
  if (waveHeight >= 2.5) return 'Shortboard or funboard'
  return 'Longboard recommended'
}

function getFallbackTimingAdvice(tideState: string, viability: SessionViability): string {
  if (!viability.viable) {
    if (viability.reason === 'lightning') return 'Wait for the storm to clear completely before considering paddling out'
    return 'Check back tomorrow for an accurate read on conditions'
  }
  if (tideState.includes('Rising')) return 'Session now — rising tide tends to clean up the waves'
  if (tideState.includes('Falling')) return 'Go sooner rather than later — falling tide can get shallow over the sandbars'
  if (tideState.includes('Low')) return 'Wait for the tide to come up a bit for better shape'
  return 'Mid to outgoing tide usually favours the local breaks — check tide charts for timing'
}

function createDetailedSurfPrompt(surfData: any): string {
  const windMph = Math.round(surfData.details.wind_speed_kts * 1.15078)
  const swellDirection = getCompassDirection(surfData.details.swell_direction_deg)
  const windDirection = getCompassDirection(surfData.details.wind_direction_deg)
  const { hour, month, formatted: localTime } = getEasternTime()
  const viability = getSessionViability(hour, month, surfData.weather.weather_description)

  const viabilityNote = viability.viable
    ? 'Surfable now'
    : viability.reason === 'lightning'
      ? 'NOT SURFABLE — thunderstorm/lightning activity'
      : `NOT SURFABLE NOW — nighttime (light returns ~${viability.riseStr})`

  const viabilityInstructions = viability.viable ? '' : viability.reason === 'lightning'
    ? `
IMPORTANT — SAFETY OVERRIDE:
There is active lightning or thunderstorm activity. This overrides everything else.
- Lead paragraph 1 with a clear, direct safety warning: the ocean is UNSAFE during electrical activity. No hedging.
- Paragraph 2 should describe what conditions will look like once the storm clears, and when to check back.
- timingAdvice must tell the user to wait until the storm passes before considering the water.`
    : `
IMPORTANT — TIMING OVERRIDE:
It is currently nighttime. Nobody surfs in the dark.
- Do NOT attempt to describe or predict tomorrow's conditions — you have no forecast data, only a current snapshot that may not reflect what morning will bring.
- Paragraph 1: acknowledge it's night and surfing isn't happening. If the user seems curious about conditions, you may briefly describe the CURRENT snapshot (not as a prediction) — e.g. "if you're wondering what's out there right now, there's X ft at Xs from the Y."
- Paragraph 2: keep it short. Tell them to come back tomorrow when conditions can be properly assessed. No guessing, no false optimism.
- timingAdvice: "Check back tomorrow" — nothing more specific.`

  return `You are an experienced local surf forecaster for St. Augustine, Florida. Write a 2-paragraph surf report. Be honest — don't oversell poor surf.

CURRENT CONDITIONS:
• Wave Height: ${surfData.details.wave_height_ft} feet
• Wave Period: ${surfData.details.wave_period_sec} seconds
• Swell Direction: ${surfData.details.swell_direction_deg}° (${swellDirection})
• Wind: ${windMph} mph ${windDirection}
• Tide: ${surfData.details.tide_state} (${surfData.details.tide_height_ft}ft)
• Water Temp: ${surfData.weather.water_temperature_f}°F
• Weather: ${surfData.weather.weather_description}
• Overall Score: ${surfData.score}/100
• Wave Quality: ${getWaveQuality(surfData.details.wave_height_ft, surfData.details.wave_period_sec)}
• Tide Context: ${getTideContext(surfData.details.tide_state)}
• Local Time: ${localTime} ET
• Session Status: ${viabilityNote}
${viabilityInstructions}
NOTE: The raw numbers above are already shown to the user as data cards. The paragraphs below should interpret and contextualise — not restate the same figures.

WRITE EXACTLY 2 PARAGRAPHS:

**Paragraph 1 - Conditions Analysis** (3-4 sentences):
Synthesise what the wave height, period, swell direction, and wind actually mean for surf quality here — the character of the waves, whether they'll have power or be mushy, onshore/offshore effect. Weave in how the tide and water temp affect the experience. Do NOT simply list each metric again.

**Paragraph 2 - Context & Vibe** (3-4 sentences):
The app already shows the user their board recommendation, wetsuit, and top spots as separate UI elements — do NOT repeat those specifics here. Instead give the reasoning and local context: why certain spots work or don't in these conditions, what the crowd/vibe will be like, the best window in the day and why, and an honest bottom-line take on whether it's worth paddling out.

TONE: Conversational local surfer. Use some surf slang but keep it readable.`
}

async function generateDetailedSurfReport(surfData: any) {
  console.log('🤖 Generating detailed surf report with compass directions...')

  try {
    const prompt = createDetailedSurfPrompt(surfData)

    const { object: aiResponse } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: surfReportSchema,
      prompt,
      temperature: 0.6,
      maxTokens: 800,
    })

    const fullReport = [
      aiResponse.conditionsAnalysis,
      aiResponse.recommendationsAndOutlook
    ].join('\n\n')

    console.log(`✅ AI generated report (${fullReport.split(' ').length} words)`)

    const report = {
      id: `surf_2para_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      location: surfData.location,
      report: fullReport,
      conditions: {
        wave_height_ft: surfData.details.wave_height_ft,
        wave_period_sec: surfData.details.wave_period_sec,
        wind_speed_kts: surfData.details.wind_speed_kts,
        wind_direction_deg: surfData.details.wind_direction_deg,
        tide_state: surfData.details.tide_state,
        weather_description: surfData.weather.weather_description,
        surfability_score: surfData.score,
        swell_direction_deg: surfData.details.swell_direction_deg,
        swell_direction_compass: surfData.details.swell_direction_compass,
        swell_direction_text: surfData.details.swell_direction_text,
        swell_direction_description: surfData.details.swell_direction_description,
        wind_direction_compass: surfData.details.wind_direction_compass,
        wind_direction_text: surfData.details.wind_direction_text,
        wind_direction_description: surfData.details.wind_direction_description,
        tide_height_ft: surfData.details.tide_height_ft,
        water_temperature_c: surfData.weather.water_temperature_c,
        water_temperature_f: surfData.weather.water_temperature_f,
        air_temperature_c: surfData.weather.air_temperature_c,
        air_temperature_f: surfData.weather.air_temperature_f
      },
      recommendations: {
        board_type: aiResponse.recommendations.boardType,
        wetsuit_thickness: aiResponse.recommendations.wetsuitThickness,
        skill_level: aiResponse.recommendations.skillLevel,
        best_spots: aiResponse.recommendations.bestSpots,
        timing_advice: aiResponse.recommendations.timingAdvice
      },
      cached_until: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      generation_meta: {
        backend: 'bun-enhanced-with-compass',
        model: 'gpt-4o-mini',
        report_length: fullReport.length,
        word_count: fullReport.split(' ').length,
        paragraphs: 2,
        prompt_version: '2.4',
        includes_compass_data: true
      }
    }

    return report

  } catch (error) {
    console.error('❌ Enhanced AI generation failed:', error)

    const windMph = Math.round(surfData.details.wind_speed_kts * 1.15078)
    const { hour, month } = getEasternTime()
    const viability = getSessionViability(hour, month, surfData.weather.weather_description)
    const fallbackReport = createEnhancedFallbackReport(surfData, windMph, viability)

    return {
      id: `surf_fallback_enhanced_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      location: surfData.location,
      report: fallbackReport,
      conditions: {
        wave_height_ft: surfData.details.wave_height_ft,
        wave_period_sec: surfData.details.wave_period_sec,
        wind_speed_kts: surfData.details.wind_speed_kts,
        wind_direction_deg: surfData.details.wind_direction_deg,
        tide_state: surfData.details.tide_state,
        weather_description: surfData.weather.weather_description,
        surfability_score: surfData.score,
        swell_direction_deg: surfData.details.swell_direction_deg,
        swell_direction_compass: surfData.details.swell_direction_compass,
        swell_direction_text: surfData.details.swell_direction_text,
        swell_direction_description: surfData.details.swell_direction_description,
        wind_direction_compass: surfData.details.wind_direction_compass,
        wind_direction_text: surfData.details.wind_direction_text,
        wind_direction_description: surfData.details.wind_direction_description,
        tide_height_ft: surfData.details.tide_height_ft,
        water_temperature_c: surfData.weather.water_temperature_c,
        water_temperature_f: surfData.weather.water_temperature_f,
        air_temperature_c: surfData.weather.air_temperature_c,
        air_temperature_f: surfData.weather.air_temperature_f
      },
      recommendations: {
        board_type: getBoardTypeRecommendation(surfData.details.wave_height_ft),
        wetsuit_thickness: surfData.weather.water_temperature_f < 65 ? '3/2mm'
          : surfData.weather.water_temperature_f < 72 ? 'Spring suit'
          : undefined,
        skill_level: surfData.score >= 65 ? 'intermediate' : 'beginner',
        best_spots: ['Vilano Beach', 'St. Augustine Pier', 'Crescent Beach'],
        timing_advice: getFallbackTimingAdvice(surfData.details.tide_state, viability)
      },
      cached_until: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      generation_meta: {
        backend: 'bun-enhanced-fallback',
        model: 'hardcoded-with-compass',
        report_length: fallbackReport.length,
        word_count: fallbackReport.split(' ').length,
        paragraphs: 2,
        prompt_version: '2.4',
        includes_compass_data: true
      }
    }
  }
}

function createEnhancedFallbackReport(surfData: any, windMph: number, viability: SessionViability): string {
  if (!viability.viable) {
    if (viability.reason === 'lightning') {
      const p1 = `Lightning and thunderstorm activity means the ocean is unsafe right now — stay out of the water. No surf session is worth the risk during an electrical storm.`
      const p2 = `Keep an eye on the radar and check back once the storm fully clears. The ${surfData.details.wave_height_ft}ft swell at ${surfData.details.wave_period_sec}s should still be around once it's safe to paddle out.`
      return `${p1}\n\n${p2}`
    }
    const waveDesc = surfData.details.wave_height_ft >= 4 ? 'solid' : surfData.details.wave_height_ft >= 2 ? 'fun-sized' : 'small'
    const p1 = `It's dark out — no surfing tonight. If you're still curious, the current snapshot shows ${waveDesc} ${surfData.details.wave_height_ft}ft waves at ${surfData.details.wave_period_sec}s from the ${surfData.details.swell_direction_compass || 'east'} with ${windMph} mph ${surfData.details.wind_direction_compass || 'variable'} winds, but that's right now — not a forecast for tomorrow.`
    const p2 = `Check back tomorrow for an accurate read on conditions. Night surf isn't worth it, and neither is guessing.`
    return `${p1}\n\n${p2}`
  }

  const condition = surfData.score >= 70 ? 'good' : surfData.score >= 50 ? 'fair' : 'poor'
  const waveDesc = surfData.details.wave_height_ft >= 4 ? 'solid'
    : surfData.details.wave_height_ft >= 2 ? 'fun-sized' : 'small'

  const swellCompass = surfData.details.swell_direction_compass || 'unknown direction'
  const windCompass = surfData.details.wind_direction_compass || 'variable'

  const paragraph1 = `St. Augustine surf check shows ${waveDesc} ${surfData.details.wave_height_ft}ft waves at ${surfData.details.wave_period_sec} seconds coming from the ${swellCompass}, delivering ${surfData.details.wave_period_sec >= 10 ? 'decent power with some nice long rides' : 'quicker, choppier waves with less power'}. Wind is ${windMph} mph from the ${windCompass} which ${windMph < 10 ? 'is light enough for clean, glassy conditions' : 'is creating some texture and bump on the water'}. Tide is ${surfData.details.tide_state.toLowerCase()} at ${surfData.details.tide_height_ft}ft and water temp is ${surfData.weather.water_temperature_f}°F.`

  const spotContext = surfData.details.wave_height_ft >= 3
    ? 'Vilano Beach or the pier area should have the most defined peaks with some punch to them'
    : 'Crescent Beach or Vilano tend to find a way to produce rideable waves even on smaller days'

  const tideNote = surfData.details.tide_state.includes('Rising')
    ? 'Tide is rising which often cleans things up — worth getting out sooner'
    : surfData.details.tide_state.includes('Falling')
    ? 'Falling tide can expose more sandbar sections, but watch for shallow spots'
    : surfData.details.tide_state.includes('Low')
    ? 'Low tide means shallower bars — check for exposed sections before paddling out'
    : 'High tide will keep things deeper and a bit mushier'

  const verdict = condition === 'good' ? 'Definitely worth the paddle out today!'
    : condition === 'fair' ? 'Surfable if you need your wave fix.'
    : 'Might be better for a beach walk, but conditions can change quickly.'

  return `${paragraph1}\n\n${spotContext}. ${tideNote}. ${verdict}`
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const method = req.method

  console.log(`${method} ${url.pathname}`)

  if (method === 'OPTIONS') return corsResponse()

  if (method === 'GET' && url.pathname === '/health') {
    return jsonResponse({
      status: 'ok',
      service: 'Can I Surf Today?',
      timestamp: new Date().toISOString(),
      runtime: 'Bun',
      version: Bun.version,
      features: ['detailed-reports', 'multi-paragraph', 'enhanced-prompts', 'session-viability']
    })
  }

  if (method === 'POST' && url.pathname === '/generate-surf-report') {
    try {
      const body = await req.json()
      const { surfData, apiKey } = body

      if (apiKey !== process.env.API_SECRET) {
        return jsonResponse({ error: 'Unauthorized' }, 401)
      }

      if (!surfData) {
        return jsonResponse({ error: 'Missing surf data' }, 400)
      }

      const report = await generateDetailedSurfReport(surfData)

      return jsonResponse({
        success: true,
        report,
        performance: {
          backend: 'bun-enhanced',
          runtime: 'bun',
          features: ['detailed-structure', 'multiple-paragraphs', 'enhanced-prompts', 'session-viability']
        }
      })

    } catch (error) {
      console.error('❌ Generate endpoint failed:', error)
      return jsonResponse({
        success: false,
        error: 'Generation failed',
        details: error instanceof Error ? error.message : String(error)
      }, 500)
    }
  }

  if (method === 'POST' && url.pathname === '/cron/generate-fresh-report') {
    try {
      const body = await req.json()
      const { cronSecret, vercelUrl } = body

      if (cronSecret !== process.env.CRON_SECRET) {
        return jsonResponse({ error: 'Unauthorized' }, 401)
      }

      console.log('🌊 Fetching surf data...')
      const surfDataResponse = await fetch(`${vercelUrl}/api/surfability`)

      if (!surfDataResponse.ok) {
        throw new Error(`Surf data failed: ${surfDataResponse.status}`)
      }

      const surfData = await surfDataResponse.json()
      console.log('📊 Got surf data:', surfData.location)

      const report = await generateDetailedSurfReport(surfData)

      console.log(`✅ Detailed report generated: ${report.id} (${report.generation_meta.word_count} words)`)

      try {
        const saveResponse = await fetch(`${vercelUrl}/api/admin/save-report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cronSecret}`
          },
          body: JSON.stringify({ report })
        })

        if (saveResponse.ok) {
          console.log('✅ Detailed report saved successfully')
        } else {
          console.warn('⚠️ Save failed but continuing:', saveResponse.status)
        }

      } catch (saveError) {
        console.warn('⚠️ Save error but continuing:', saveError)
      }

      return jsonResponse({
        success: true,
        timestamp: new Date().toISOString(),
        backend: 'bun-enhanced',
        actions: {
          surf_data_fetched: true,
          ai_report_generated: true,
          new_report_id: report.id,
          report_quality: {
            word_count: report.generation_meta.word_count,
            paragraphs: report.generation_meta.paragraphs,
            length: report.generation_meta.report_length,
            backend: report.generation_meta.backend
          }
        }
      })

    } catch (error) {
      console.log('❌ Enhanced cron endpoint failed:', error)
      return jsonResponse({
        success: false,
        error: '2-paragraph cron failed',
        details: error instanceof Error ? error.message : String(error)
      }, 500)
    }
  }

  return jsonResponse({ error: 'Not found' }, 404)
}

const port = parseInt(process.env.PORT || '3000')

console.log(`🚀 Can I Surf Today? starting on port ${port}`)
console.log(`⚡ Runtime: Bun ${Bun.version}`)

serve({
  port,
  async fetch(req) {
    try {
      return await handleRequest(req)
    } catch (error) {
      console.error('🚨 Request failed:', error)
      return jsonResponse({
        error: 'Internal error',
        details: error instanceof Error ? error.message : String(error)
      }, 500)
    }
  }
})

console.log(`✅ Bun server running at http://localhost:${port}`)
