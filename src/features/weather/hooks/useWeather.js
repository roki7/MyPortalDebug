import { useEffect, useState } from "react";

/**
 * Fetches daily weather info from Open-Meteo for the given location.
 * @param {{lat:number, lon:number}|null|undefined} locationSettings
 * @returns {Record<string, {code:number, pressure:number}>}
 */
export const useWeather = (locationSettings) => {
  const [weatherData, setWeatherData] = useState({});

  useEffect(() => {
    if (!locationSettings?.lat || !locationSettings?.lon) {
      setWeatherData({});
      return;
    }

    const { lat, lon } = locationSettings;

    const controller = new AbortController();
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}` +
      `&longitude=${lon}` +
      `&daily=weathercode,surface_pressure_mean` +
      `&timezone=Asia%2FTokyo`;

    fetch(url, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (!d?.daily?.time) return;
        const w = {};
        d.daily.time.forEach((t, i) => {
          w[t] = {
            code: d.daily.weathercode?.[i],
            pressure: d.daily.surface_pressure_mean?.[i],
          };
        });
        setWeatherData(w);
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        console.error("[useWeather] Weather fetch failed", e);
      });

    return () => controller.abort();
  }, [locationSettings?.lat, locationSettings?.lon]);

  return weatherData;
};
