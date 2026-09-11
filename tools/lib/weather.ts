/**
 * The two things a plan page cannot state for itself: what time the sun sets,
 * and what the weather is going to do. Both are computed for the club's own
 * location, which arrives as config rather than being baked in here.
 */

export interface Place {
  latitude: number;
  longitude: number;
  timezone: string;
  locale: string;
}

// --------------------------------------------------------------------- sun

/**
 * Sunset at a place on an ISO date, as local wall-clock time. The standard
 * sunrise equation; the timezone (and therefore summer time) is left to Intl
 * rather than reimplemented. Returns null if the sun does not set, which cannot
 * happen at a rugby club's latitude but keeps the maths honest.
 */
export function sunsetAt(isoDate: string, place: Place): string | null {
  const rad = Math.PI / 180;
  const jDate = Date.parse(`${isoDate}T00:00:00Z`) / 86400000 + 2440587.5;
  const n = Math.ceil(jDate - 2451545.0 + 0.0008);
  const jStar = n + place.longitude / 360; // east longitude is positive here
  const M = (357.5291 + 0.98560028 * jStar) % 360;
  const C =
    1.9148 * Math.sin(M * rad) +
    0.02 * Math.sin(2 * M * rad) +
    0.0003 * Math.sin(3 * M * rad);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const jTransit =
    2451545.0 + jStar + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * lambda * rad);
  const sinDec = Math.sin(lambda * rad) * Math.sin(23.44 * rad);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosOmega =
    (Math.sin(-0.833 * rad) - Math.sin(place.latitude * rad) * sinDec) /
    (Math.cos(place.latitude * rad) * cosDec);
  if (cosOmega < -1 || cosOmega > 1) return null;
  const omega = Math.acos(cosOmega) / rad;
  const jSet = jTransit + omega / 360;
  const when = new Date((jSet - 2440587.5) * 86400000);
  return new Intl.DateTimeFormat(place.locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: place.timezone,
  }).format(when);
}

// ----------------------------------------------------------------- weather

/** WMO weather codes, in the words a coach would use. */
const WMO: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Showers",
  81: "Showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Snow showers",
  95: "Thunderstorms",
  96: "Thunderstorms, hail",
  99: "Thunderstorms, hail",
};

/** Days ahead Open-Meteo will forecast. */
const FORECAST_DAYS = 15;

/** The session hours a forecast should describe: the start hour and the two
 *  after it, which covers a 90-minute session whichever end it runs over. */
function sessionHours(start: string | undefined): number[] {
  const h = Number((start ?? "18:00").slice(0, 2));
  return [h, h + 1, h + 2].filter((n) => n >= 0 && n <= 23);
}

/** A session a forecast is wanted for. */
export interface Dated {
  date: string;
  start?: string;
}

/**
 * Fetch the forecast for every planned session inside the horizon, in one
 * request, keyed by ISO date. Only sessions still ahead of us are fetched — a
 * past session's page is an archive and should not claim to know what the
 * weather was going to be.
 *
 * Never fails the build: no network (a local preview on a train, say) simply
 * means no Weather row, which is better than a broken build or a stale number
 * baked into the markdown.
 */
export async function loadForecasts(
  sessions: Dated[],
  place: Place,
  generated: string,
): Promise<Map<string, string>> {
  const forecasts = new Map<string, string>();
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + FORECAST_DAYS * 86400000)
    .toISOString()
    .slice(0, 10);
  const wanted = sessions
    .filter((m) => m.date >= today && m.date <= horizon)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!wanted.length) return forecasts;

  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${place.latitude}&longitude=${place.longitude}` +
    "&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m" +
    `&wind_speed_unit=mph&timezone=${encodeURIComponent(place.timezone)}` +
    `&start_date=${wanted[0]!.date}&end_date=${wanted[wanted.length - 1]!.date}`;

  let hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
    wind_speed_10m: number[];
  };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    hourly = ((await res.json()) as { hourly: typeof hourly }).hourly;
    if (!hourly?.time?.length) throw new Error("no hourly data");
  } catch (err) {
    console.log(`no weather forecast (${(err as Error).message}) — Weather rows omitted`);
    return forecasts;
  }

  const at = new Map(hourly.time.map((t, i) => [t, i]));
  for (const meta of wanted) {
    const idx = sessionHours(meta.start)
      .map((h) => at.get(`${meta.date}T${String(h).padStart(2, "0")}:00`))
      .filter((i): i is number => i !== undefined);
    if (!idx.length) continue;
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const temp = Math.round(mean(idx.map((i) => hourly.temperature_2m[i]!)));
    const wind = Math.round(mean(idx.map((i) => hourly.wind_speed_10m[i]!)));
    const rain = Math.max(...idx.map((i) => hourly.precipitation_probability[i]!));
    // The most common condition across the session, not the worst hour of it —
    // one drizzly hour at the end should not be reported as a wet session; the
    // rain chance beside it is what carries that risk.
    const counts = new Map<number, number>();
    for (const i of idx) {
      const c = hourly.weather_code[i]!;
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const code = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]![0];
    const cond = WMO[code] ?? "Mixed";
    const window = `${String(sessionHours(meta.start)[0]).padStart(2, "0")}:00`;
    forecasts.set(
      meta.date,
      `${cond}, ${temp}°C, wind ${wind} mph, ${rain}% chance of rain. ` +
        `*(From ${window}; forecast as of ${generated}.)*`,
    );
  }
  return forecasts;
}
