# Teknisk Specifikation: High-Performance Sensor Data Platform

## 1. Sammanfattning
Detta dokument beskriver den tekniska arkitekturen för en skalbar, webbaserad plattform designad för att visualisera och analysera massiva mängder sensordata (900GB+). Systemet är byggt för att hantera 5000+ samtidiga sensorer med millisekund-precision utan prestandaförluster.

## 2. Arkitekturöversikt
Systemet följer en modern **Client-Server-arkitektur** med "Separation of Concerns". Frontend ansvarar för presentation och interaktivitet, medan Backend hanterar datatung bearbetning och lagring.

### Dataflöde
1.  **Ingest**: Rådata (CSV) läses in och indexeras.
2.  **Lagring**: DuckDB (PoC) eller TimescaleDB (Prod) lagrar datan kolumnbaserat.
3.  **API**: Frontend begär data för ett tidsfönster (t.ex. "senaste timmen"). API:et hämtar data och kan downsampla den för att matcha skärmens upplösning.
4.  **Visualisering**: Frontend renderar datan med hårdvaruaccelererad grafik (Canvas/WebGL).

---

## 3. Frontend-arkitektur (Implementerad)
Användargränssnittet är byggt för extrem responsivitet ("Scientific Dashboard").

### Kärnteknologier
*   **Ramverk**: **React 18** med **Vite**. Valdes för sitt enorma ekosystem och framtidssäkring.
*   **Språk**: **TypeScript**. Ger typsäkerhet som minskar buggar drastiskt i komplexa system.
*   **Styling**: **TailwindCSS** + **Shadcn/ui**. Ger ett modernt, konsekvent utseende (Dark Mode).

### Prestandastrategi ("The 60 FPS Goal")
För att klara massiva datamängder undviker vi standard DOM-manipulation.
1.  **Grafer (uPlot)**: Använder HTML5 Canvas för att rita linjer. Detta är 10-100x snabbare än SVG-baserade bibliotek (som Recharts/Highcharts).
2.  **Högdensitetsvy (HeatmapView)**: Egenutvecklad komponent som använder **Canvas API** för att visualisera 5000+ sensorer som en "termisk bild".
3.  **Virtualisering (LogConsole/SensorTree)**: Listor hanteras med virtuell rendering (tanstack-virtual), vilket gör att GUI:t aldrig låser sig oavsett hur många rader som finns.

---

## 4. Backend-arkitektur (Local PoC)
Backend är "motorn" som möjliggör frontendens snabbhet lokalt.

### Kärnteknologier
*   **API-Ramverk**: **FastAPI (Python)**. Asynkront och extremt snabbt.
*   **Databas**: **DuckDB**.
    *   *Varför?* En "In-Process OLAP Database". Det innebär att den är en enda fil (ingen server-installation krävs) men är optimerad för analys av miljontals rader. Den är perfekt för att bygga en portabel PoC som presterar som ett Enterprise-system.

### Smart Datahämtning
För att förhindra att webbläsaren kraschar när man zoomar ut till "1 år":
 backend (i framtiden) implementerar **LTTB (Largest-Triangle-Three-Buckets)** eller **Min/Max-decimering** i SQL-frågan. Det reducerar 100 miljoner punkter till ~2000 visuellt identiska punkter innan det skickas över nätverket.

---

## 5. Framtidssäkring & Skalbarhet
Varför kommer detta system hålla i 10 år?

1.  **Ingen "Vendor Lock-in"**:
    *   Datan ligger i vanlig SQL. Kan läsas av Excel, PowerBI eller Python.
    *   Frontend är standard React/JavaScript.
2.  **Frikoppling (Decoupling)**:
    *   Frontend och Backend är helt separerade. Du kan byta ut databasen mot TimescaleDB eller InfluxDB utan att skriva om en enda rad kod i Frontend.
3.  **Hårdvaruoberoende**:
    *   Systemet kan köras lokalt på en laptop, på en server i fabriken, eller i molnet (AWS/Azure).

---

## 6. Nästa Steg (Roadmap)
1.  Verifiera PoC med hela datasetet (5000 filer).
2.  Implementera downsampling i `main.py`.
3.  Sätta upp en produktionsdatabas (TimescaleDB) för live-data via MQTT/Kafka.
