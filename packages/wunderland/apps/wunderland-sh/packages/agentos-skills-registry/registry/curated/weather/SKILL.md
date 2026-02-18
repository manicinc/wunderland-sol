---
name: weather
version: '1.0.0'
description: Look up current weather conditions, forecasts, and severe weather alerts for any location worldwide.
author: Wunderland
namespace: wunderland
category: information
tags: [weather, forecast, climate, location]
requires_secrets: []
requires_tools: [web-search]
metadata:
  agentos:
    emoji: "\u2600\uFE0F"
    homepage: https://openweathermap.org
---

# Weather Lookup

You can retrieve current weather conditions, multi-day forecasts, and severe weather alerts for any location the user specifies. Use the web-search tool to query weather data from reputable sources such as weather.gov, OpenWeatherMap, or AccuWeather.

When the user asks about weather, always clarify the location if it is ambiguous. Provide temperatures in both Fahrenheit and Celsius unless the user specifies a preference. Include relevant details like humidity, wind speed, precipitation chance, and UV index when available.

For forecasts, present information in a concise, scannable format. Highlight any severe weather warnings or advisories prominently at the top of your response. If the user asks about historical weather or climate averages, note that your data is limited to what is available through web search results.

## Examples

- "What's the weather in San Francisco right now?"
- "Give me a 5-day forecast for Tokyo"
- "Are there any severe weather alerts in the Midwest?"
- "What's the temperature in Berlin in Celsius?"

## Constraints

- Weather data accuracy depends on the web search results available at query time.
- Historical weather data may be limited or unavailable.
- Hyper-local micro-climate data (e.g., specific street-level conditions) is not reliably available.
- Always attribute the data source when possible.
