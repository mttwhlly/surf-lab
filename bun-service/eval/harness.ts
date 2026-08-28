// Local eval harness for createDetailedSurfPrompt / generateDetailedSurfReport.
// Run with: bun run eval/harness.ts   (from bun-service/, needs ANTHROPIC_API_KEY in env)
//
// Hits the real model (no mocked LLM) so output can be eyeballed for repetition
// and hallucination. Writes a timestamped transcript to eval/output/ and prints
// to stdout. No pass/fail assertions — this is qualitative, read it yourself.

import { generateDetailedSurfReport, type LocationContext } from '../index'

interface MockConditions {
  wave_height_ft: number
  wave_period_sec: number
  swell_direction_deg: number
  wind_speed_kts: number
  wind_direction_deg: number
  tide_state: string
  tide_height_ft: number
  water_temperature_f: number
  weather_description: string
  score: number
}

function mockSurfData(locationSlug: string, locationName: string, c: MockConditions) {
  return {
    location: locationName,
    locationSlug,
    score: c.score,
    details: {
      wave_height_ft: c.wave_height_ft,
      wave_period_sec: c.wave_period_sec,
      swell_direction_deg: c.swell_direction_deg,
      wind_speed_kts: c.wind_speed_kts,
      wind_direction_deg: c.wind_direction_deg,
      tide_state: c.tide_state,
      tide_height_ft: c.tide_height_ft,
    },
    weather: {
      water_temperature_c: Math.round((c.water_temperature_f - 32) * 5 / 9),
      water_temperature_f: c.water_temperature_f,
      air_temperature_c: 24,
      air_temperature_f: 75,
      weather_description: c.weather_description,
    },
    tides: {
      next_high: { time: '4:12 PM', height: 4.8, timestamp: new Date().toISOString() },
      next_low: { time: '10:03 PM', height: 0.6, timestamp: new Date().toISOString() },
    },
  }
}

// The exact "mediocre, choppy, no punch" conditions called out in the map as
// today's live repro — used unchanged across locations to stress cross-location
// convergence.
const MEDIOCRE: MockConditions = {
  wave_height_ft: 1.8,
  wave_period_sec: 6,
  swell_direction_deg: 80,
  wind_speed_kts: 12,
  wind_direction_deg: 200,
  tide_state: 'Mid Rising',
  tide_height_ft: 2.1,
  water_temperature_f: 78,
  weather_description: 'Partly cloudy',
  score: 42,
}

const GOOD_DAY: MockConditions = {
  wave_height_ft: 4.5,
  wave_period_sec: 11,
  swell_direction_deg: 70,
  wind_speed_kts: 6,
  wind_direction_deg: 280,
  tide_state: 'Low Rising',
  tide_height_ft: 0.8,
  water_temperature_f: 70,
  weather_description: 'Clear sky',
  score: 82,
}

const LIGHTNING: MockConditions = {
  ...MEDIOCRE,
  weather_description: 'Thunderstorm',
}

const CROSS_LOCATION_CONTEXTS: Array<{ slug: string; ctx: LocationContext }> = [
  {
    slug: 'st-augustine',
    ctx: {
      locationName: 'St. Augustine, FL',
      localKnowledge: `East-facing beach break. Works best on NE to E swell, 2–6ft at 8s+. Offshore on W–NW winds. Sandbars shift constantly — Vilano Beach tends to have the most defined peaks. Crescent Beach is more sheltered and mellower, good for beginners. The pier area can focus and hollow out the swell. Mid rising tide is usually the sweet spot. Summer is almost flat; fall through spring is prime season. Water is warm year-round — no wetsuit needed summer through early fall.`,
      voiceDescriptor: `laid-back Florida local who knows every sandbar at St. Augustine. Practical and honest — doesn't oversell bad surf but gets genuinely stoked when the swell shows up`,
      bestSpots: ['Vilano Beach', 'St. Augustine Pier', 'Crescent Beach'],
      lat: 29.9,
      timezone: 'America/New_York',
    },
  },
  {
    slug: 'boca-raton',
    ctx: {
      locationName: 'Boca Raton, FL',
      localKnowledge: `Southeast-facing stretch of beach break. Very tide-sensitive — low to mid rising is best on most peaks. The Boca Inlet jetties focus swell and create sandbars on the south side, often the best setup in the area. Summer is mostly flat; fall and spring can bring SE swell from tropical systems. Winter NE swells lose energy working down the coast and often arrive soft and disorganised. Seagrass patches near shore can grab fins at low tide. Offshore on W–NW winds. Rip currents common near the inlet — respect the hazard.`,
      voiceDescriptor: `South Florida surfer who keeps expectations realistic but celebrates the spot's potential. Comfortable recommending when to wait for a better swell, but genuinely stoked when conditions deliver`,
      bestSpots: ['Spanish River Park', 'Red Reef Park', 'Boca Inlet South Jetty'],
      lat: 26.35,
      timezone: 'America/New_York',
    },
  },
  {
    slug: 'higgins-beach',
    ctx: {
      locationName: 'Higgins Beach, ME',
      localKnowledge: `North Atlantic cold-water beach break. Prime season is September through May. NE groundswell from winter nor'easters and Gulf of Maine fetch can deliver hollow, powerful waves. Offshore on S–SW winds. Tidal range is extreme (10–12ft) — timing the tide is critical; low to mid tide usually produces the best peaks over the sandbars. High tide often floods the beach entirely. Water is cold year-round: 5/4mm suit with hood and gloves in winter (38–50°F), at least a 3/2mm spring through fall (55–65°F). Hurricane season (August–October) brings some of the best long-period groundswells. Fog is common — check visibility before paddling out.`,
      voiceDescriptor: `Maine surfer — stoic, no-nonsense, comfortable in cold water. Respects the ocean's power and calls conditions accurately. Gets quietly stoked when it goes off, matter-of-fact about the cold`,
      bestSpots: ['Higgins Beach', 'Scarborough Beach', 'Pine Point'],
      lat: 43.55,
      timezone: 'America/New_York',
    },
  },
  {
    slug: 'huntington-beach',
    ctx: {
      locationName: 'Huntington Beach, CA',
      localKnowledge: `Classic SoCal beach break. Consistent SW to W swell year-round — Southern Hemisphere groundswells arrive spring and summer, NW swells dominate fall and winter. The pier area focuses swell and creates excellent sandbars on both sides; pier north tends to produce a longer workable right, pier south can be punchier. Offshore on NE winds (Santa Ana conditions — classic glassy mornings). Onshore sea breeze builds through the afternoon most days, so morning sessions are almost always better. Low to mid tide usually best for most peaks. Water is cool year-round (56–72°F) — wetsuit recommended except peak summer for most surfers.`,
      voiceDescriptor: `classic SoCal surf culture — relaxed, enthusiastic, knows the lineup and its rhythms. Straightforward about when morning glass makes the alarm clock worth it versus when you can sleep in`,
      bestSpots: ['HB Pier (north and south sides)', 'Bolsa Chica', 'Newport Beach Pier'],
      lat: 33.65,
      timezone: 'America/Los_Angeles',
    },
  },
]

const ST_AUGUSTINE_CTX = CROSS_LOCATION_CONTEXTS[0]!.ctx

// Fixed UTC instants so day/night is deterministic regardless of when the harness runs.
const DAYTIME_NOW = new Date('2026-08-28T18:00:00Z')  // ~2pm EDT / 11am PDT
const NIGHT_NOW = new Date('2026-08-28T06:00:00Z')     // ~2am EDT — before sunrise

const lines: string[] = []
function log(s: string = '') {
  console.log(s)
  lines.push(s)
}

function header(title: string) {
  log()
  log('='.repeat(80))
  log(title)
  log('='.repeat(80))
}

async function runOne(label: string, slug: string, locationName: string, ctx: LocationContext, c: MockConditions, now: Date) {
  header(label)
  const surfData = mockSurfData(slug, locationName, c)
  const result = await generateDetailedSurfReport(surfData, ctx, now)
  log(`[backend: ${result.generation_meta.backend}, words: ${result.generation_meta.word_count}]`)
  log()
  log(result.report)
}

async function main() {
  header('CROSS-LOCATION: identical mediocre conditions across 4 locations')
  log('(Testing whether output converges on the same template regardless of place.)')
  for (const { slug, ctx } of CROSS_LOCATION_CONTEXTS) {
    await runOne(`Location: ${ctx.locationName}`, slug, ctx.locationName, ctx, MEDIOCRE, DAYTIME_NOW)
  }

  header('CROSS-DAY: same location, same conditions, generated twice')
  log('(Simulating two consecutive days with near-identical conditions.)')
  await runOne('St. Augustine — "Day 1"', 'st-augustine', ST_AUGUSTINE_CTX.locationName, ST_AUGUSTINE_CTX, MEDIOCRE, DAYTIME_NOW)
  await runOne('St. Augustine — "Day 2" (same inputs)', 'st-augustine', ST_AUGUSTINE_CTX.locationName, ST_AUGUSTINE_CTX, MEDIOCRE, DAYTIME_NOW)

  header('EDGE CASES')
  await runOne('Normal daytime, good conditions', 'st-augustine', ST_AUGUSTINE_CTX.locationName, ST_AUGUSTINE_CTX, GOOD_DAY, DAYTIME_NOW)
  await runOne('Night (before sunrise)', 'st-augustine', ST_AUGUSTINE_CTX.locationName, ST_AUGUSTINE_CTX, MEDIOCRE, NIGHT_NOW)
  await runOne('Lightning / thunderstorm override', 'st-augustine', ST_AUGUSTINE_CTX.locationName, ST_AUGUSTINE_CTX, LIGHTNING, DAYTIME_NOW)

  const outPath = `eval/output/${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
  await Bun.write(outPath, lines.join('\n') + '\n')
  console.log(`\nTranscript written to ${outPath}`)
}

main()
