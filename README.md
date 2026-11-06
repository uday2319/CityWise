**CityWise – Smart Path for Meaningful Travel**
An AI-powered travel itinerary generator that creates personalized, day-wise travel plans for Indian cities based on natural language preferences and real-world place data.

Project Description
CityWise accepts a city name, number of travel days, daily budget in Indian Rupees, and a free-text description of travel interests. It uses Sentence-BERT to semantically understand the preference description, fetches real tourist attractions from the Geoapify Places API, builds a dynamic FAISS index for similarity search, re-ranks results using a trained XGBoost model, optimizes the daily visit route using Google OR-Tools, and returns a complete day-by-day itinerary with time slots, restaurant recommendations, and a budget breakdown — rendered on an interactive map.

Itineraries are generated in real time and returned directly as API responses. No data is stored between sessions.

**Features**
- Natural language preference understanding using Sentence-BERT
- Live attraction data fetched from Geoapify Places API
- Dynamic FAISS index built per request for semantic similarity search
- Gradient boosting learning-to-rank using XGBoost (pairwise objective)
- Route optimization per day using Google OR-Tools (TSP solver)
- Constraint-based day scheduling with no attraction repeated across days
- Numeric INR budget enforcement at attraction and restaurant level
- Separate lunch and dinner recommendations filtered by city and budget
- Interactive Leaflet map with numbered markers and optimized route polyline
- Per-day budget utilization reporting

**Tech Stack**

*Backend*
Tool	Purpose
FastAPI	REST API server
Pydantic	Request and response validation
Uvicorn	ASGI server
httpx	HTTP client for Geoapify API calls


*Frontend*
Tool	Purpose
React + TypeScript	UI framework with static type checking
Vite	Build tool and development server
Tailwind CSS	Utility-first styling
React Leaflet + Leaflet.js	Interactive map with markers and route polyline
TanStack React Query	API call management and loading states
Axios	HTTP client


*Machine Learning*
Tool	Purpose
Sentence-BERT (all-MiniLM-L6-v2)	Converts text to 384-dimensional semantic embeddings
FAISS (IndexFlatIP)	Dynamic vector similarity search per request
XGBoost (XGBRanker)	Pairwise learning-to-rank model
Google OR-Tools	Route optimization via TSP solver
geopy + Nominatim	City geocoding and distance calculation

*Data Source*
Source	Purpose
Geoapify Places API	Live tourist attractions with GPS coordinates
Nominatim (OpenStreetMap)	City name to latitude/longitude geocoding

**Project Structure**

citywise/
│
├── backend/                        # FastAPI application
│   ├── api/
│   │   └── routes/                 # API route handlers
│   ├── core/
│   │   └── config.py               # Environment-based settings
│   ├── schemas/
│   │   └── itinerary_schema.py     # Pydantic request/response schemas
│   ├── services/
│   │   ├── ml_service.py           # ML pipeline orchestrator
│   │   └── geo_service.py          # Geoapify API integration
│   └── main.py                     # FastAPI app entry point
│
├── ml/                             # Machine learning pipeline
│   ├── recommender/
│   │   └── semantic_search.py      # SBERT encoding + dynamic FAISS search
│   ├── ranking/
│   │   └── train_ranker.py         # XGBRanker training and inference
│   ├── optimizer/
│   │   └── route_optimizer.py      # OR-Tools TSP route optimizer
│   └── scheduler/
│       └── day_scheduler.py        # Constraint-based day planner
│
├── data/
│   ├── processed/                  # Cleaned restaurant data (sample)
│   └── models/                     # Trained XGBoost model artifact
│
├── frontend/                       # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── TripForm.tsx        # User input form
│   │   │   ├── ItineraryCard.tsx   # Day card with attraction timeline
│   │   │   ├── ItineraryMap.tsx    # Leaflet map with markers and route
│   │   │   └── BudgetPanel.tsx     # Budget breakdown display
│   │   ├── api/
│   │   │   └── itineraApi.ts       # Axios API client
│   │     ├── types/
│   │   │   └── index.ts            # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── requirements.txt
├── .env.example
└── README.md
