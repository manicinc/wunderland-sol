---
id: dynamic-docs-trip-example
slug: trip-planning-example
title: "Trip Planning: San Francisco Adventure"
version: "1.0.0"
difficulty: intermediate
contentType: trip
taxonomy:
  subjects:
    - travel
    - planning
  topics:
    - trip-planning
    - dynamic-documents
tags:
  - travel
  - san-francisco
  - example
  - embark
  - mentions
  - formulas
  - maps
relationships:
  references:
    - dynamic-docs-intro
publishing:
  status: published
  lastUpdated: "2024-12-31"
summary: A complete trip planning example demonstrating @mentions, maps, weather formulas, and calendar views.
---

# 🌉 San Francisco Adventure

A 3-day trip to the City by the Bay, demonstrating all dynamic document features!

---

## 📋 Trip Overview

| Detail | Value |
|--------|-------|
| **Destination** | @[San Francisco, CA](place-san-francisco) |
| **Dates** | @[January 15, 2025](date-start) → @[January 17, 2025](date-end) |
| **Travelers** | @[You](person-self), @[Travel Buddy](person-buddy) |
| **Budget** | $1,500 |

---

## 🗺️ Destinations Map

All the places we'll visit, displayed on an interactive map:

```view-map
{
  "type": "map",
  "title": "SF Trip Destinations",
  "scope": "document",
  "settings": {
    "zoom": 12,
    "center": { "lat": 37.7749, "lng": -122.4194 },
    "showMarkers": true,
    "markerStyle": "pins",
    "showRoute": true
  },
  "filter": { "types": ["place"] }
}
```

---

## 📅 Day 1: Arrival & Fisherman's Wharf

**Date:** @[January 15, 2025](date-day1)

### Morning
- ✈️ Arrive at @[San Francisco International Airport (SFO)](place-sfo)
- 🚕 Take BART downtown

### Afternoon
- 🏨 Check in at @[Hotel Nikko San Francisco](place-hotel-nikko)
  - *Address: 222 Mason St, San Francisco*
- 🍽️ Lunch at @[Boudin Bakery](place-boudin) - famous sourdough bread bowls!

### Evening
- 🦀 Explore @[Fisherman's Wharf](place-fishermans-wharf)
- 🎪 See the sea lions at @[Pier 39](place-pier-39)
- 🍝 Dinner at @[Scoma's Restaurant](place-scomas)

### Day 1 Weather Forecast

```formula:day1_weather
=WEATHER("San Francisco, CA", "2025-01-15")
```

---

## 📅 Day 2: Golden Gate & Alcatraz

**Date:** @[January 16, 2025](date-day2)

### Morning
- 🌉 Walk across @[Golden Gate Bridge](place-golden-gate-bridge)
- 📸 Photo stop at @[Battery Spencer](place-battery-spencer) viewpoint

### Afternoon
- ⛴️ Ferry to @[Alcatraz Island](place-alcatraz)
  - *Book tickets in advance!*
- 🎧 Audio tour of the historic prison

### Evening
- 🍫 Treats at @[Ghirardelli Square](place-ghirardelli)
- 🌅 Sunset views from @[Crissy Field](place-crissy-field)

### Day 2 Route Distance

```formula:day2_distance
=ADD(
  =DISTANCE("Hotel Nikko San Francisco", "Golden Gate Bridge"),
  =DISTANCE("Golden Gate Bridge", "Alcatraz Ferry"),
  =DISTANCE("Alcatraz Ferry", "Ghirardelli Square")
)
```

### Day 2 Weather

```formula:day2_weather
=WEATHER("San Francisco, CA", "2025-01-16")
```

---

## 📅 Day 3: Culture & Departure

**Date:** @[January 17, 2025](date-day3)

### Morning
- 🚃 Ride the @[Cable Cars](place-cable-cars) on Powell-Hyde line
- 🏛️ Visit @[SF Museum of Modern Art (SFMOMA)](place-sfmoma)

### Afternoon
- 🛍️ Browse @[Ferry Building Marketplace](place-ferry-building)
- ☕ Coffee at @[Blue Bottle Coffee](place-blue-bottle)

### Evening
- 🧳 Check out of hotel
- ✈️ Depart from @[SFO](place-sfo)

### Day 3 Weather

```formula:day3_weather
=WEATHER("San Francisco, CA", "2025-01-17")
```

---

## 📅 Full Itinerary Calendar

View all events in calendar format:

```view-calendar
{
  "type": "calendar",
  "title": "Trip Schedule",
  "scope": "document",
  "settings": {
    "view": "week",
    "startDate": "2025-01-15",
    "showWeekends": true,
    "colorByType": true
  },
  "filter": { "types": ["event", "date"] }
}
```

---

## 💰 Budget Breakdown

| Category | Estimated Cost |
|----------|----------------|
| ✈️ Flights (round trip) | $450 |
| 🏨 Hotel (2 nights) | $500 |
| 🍽️ Food & Dining | $250 |
| 🎟️ Activities (Alcatraz, SFMOMA) | $100 |
| 🚕 Transportation | $100 |
| 🛍️ Shopping & Misc | $100 |

### Total Estimated Cost

```formula:trip_total
=ADD(450, 500, 250, 100, 100, 100)
```

### Per Person (2 travelers)

```formula:per_person
=DIVIDE(1500, 2)
```

---

## ✅ Packing Checklist

- [ ] Passport / ID
- [ ] Comfortable walking shoes
- [ ] Layers (SF weather is unpredictable!)
- [ ] Camera
- [ ] Phone charger
- [ ] Sunscreen
- [ ] Light jacket / windbreaker
- [ ] Reusable water bottle

---

## 📝 Important Notes

### Reservations Needed
- ⚠️ **Alcatraz** — Book 2-3 weeks in advance at [alcatrazcruises.com](https://www.alcatrazcruises.com)
- 🍽️ **Scoma's** — Dinner reservation recommended

### Local Tips
- 🌡️ SF is cold even in summer — layers are essential
- 🚃 Buy a Clipper Card for public transit
- 🌉 Golden Gate is best at sunrise/sunset
- 🦭 Pier 39 sea lions are usually there year-round

### Emergency Contacts
- Hotel: (415) 555-0123
- Airline: 1-800-555-0456

---

## 🔗 Useful Links

- [SF Travel Official Guide](https://www.sftravel.com/)
- [BART Schedule](https://www.bart.gov/)
- [Alcatraz Tickets](https://www.alcatrazcruises.com/)
- [Weather.com - SF](https://weather.com/weather/tenday/l/San+Francisco+CA)

---

> 💡 **This is a live dynamic document!** 
> - @mentions link to location data
> - Formulas calculate weather, distances, and costs
> - Views display maps and calendars
> 
> Try editing to add your own destinations!




