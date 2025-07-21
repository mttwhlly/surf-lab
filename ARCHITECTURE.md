flowchart TD
    %% User and UI Layer
    User["Surfer<br/>Views surf conditions"]
    UI["React UI (page.tsx)<br/>Displays AI surf report<br/>React Query - 5min updates"]
    
    %% Next.js API Layer
    SurfAPI["Surfability API<br/>/api/surfability<br/>Real-time conditions<br/>1.0ft, 6.7s, 95°"]
    ReportAPI["AI Surf Report API<br/>/api/surf-report<br/>GPT-4 generated reports<br/>Natural language output"]
    
    %% External APIs
    NOAA_Marine["NOAA Marine API<br/>Wave height: 1.0ft<br/>Wave period: 6.7s<br/>Swell direction: 95°"]
    NOAA_Tides["NOAA Tides API<br/>Current height: 2.6ft<br/>High/Low times<br/>Tide state: Low Falling"]
    OpenMeteo["Open-Meteo API<br/>Weather data<br/>Wind: 6.3kts from west<br/>Temperature: 87°F"]
    OpenAI["OpenAI GPT-4o-mini<br/>Report generation<br/>Natural language<br/>No emojis, compass dirs"]
    
    %% Database
    NeonDB["Neon Database<br/>PostgreSQL<br/>Cached AI reports<br/>15-minute cache"]
    
    %% Fallback Systems
    Fallbacks["Intelligent Fallbacks<br/>• Seasonal estimates<br/>• Wind-based calculations<br/>• Multiple API retries<br/>• Prevents 1.5ft/6s defaults"]
    
    %% Components Not In Use (Grayed out)
    NotInUse["⚠️ Built But Not In Use<br/>• Surf Details Cards (animations)<br/>• Weather Header & Status Card<br/>• Tide Chart Visualization<br/>• Loading animations & Toast<br/>• Service Worker & PWA<br/>• Admin endpoints & Cron jobs"]
    
    %% Data Flow Connections
    User --> UI
    UI --> ReportAPI
    ReportAPI --> SurfAPI
    ReportAPI --> OpenAI
    ReportAPI --> NeonDB
    
    SurfAPI --> NOAA_Marine
    SurfAPI --> NOAA_Tides  
    SurfAPI --> OpenMeteo
    SurfAPI --> Fallbacks
    
    %% Styling
    classDef userStyle fill:#34495e,stroke:#2c3e50,stroke-width:2px,color:#fff
    classDef uiStyle fill:#e74c3c,stroke:#c0392b,stroke-width:2px,color:#fff
    classDef apiStyle fill:#2ecc71,stroke:#27ae60,stroke-width:2px,color:#fff
    classDef externalStyle fill:#3498db,stroke:#2980b9,stroke-width:2px,color:#fff
    classDef databaseStyle fill:#9b59b6,stroke:#8e44ad,stroke-width:2px,color:#fff
    classDef fallbackStyle fill:#f39c12,stroke:#e67e22,stroke-width:2px,color:#fff
    classDef unusedStyle fill:#95a5a6,stroke:#7f8c8d,stroke-width:1px,color:#fff,opacity:0.6
    
    class User userStyle
    class UI uiStyle
    class SurfAPI,ReportAPI apiStyle
    class NOAA_Marine,NOAA_Tides,OpenMeteo,OpenAI externalStyle
    class NeonDB databaseStyle
    class Fallbacks fallbackStyle
    class NotInUse unusedStyle
    
    %% Data Flow Annotations
    UI -.->|"Every 5 minutes"| ReportAPI
    SurfAPI -.->|"1.0ft, 6.7s, southeast"| NOAA_Marine
    ReportAPI -.->|"Cache for 15min"| NeonDB
    Fallbacks -.->|"When APIs fail"| SurfAPI