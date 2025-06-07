Of course. This is an excellent project idea. Converting your powerful Python analysis script into an interactive web application is a fantastic way to make the data accessible and user-friendly.

Directly "converting" the Python code to React/JavaScript is not feasible due to the fundamental differences in language, environment (server-side vs. client-side), and the heavy data processing involved.

Instead, we will build a **Client-Server Application**.

### High-Level Architecture

1.  **Backend (Python API):** Your existing Python code will be refactored into a web API using a framework like **FastAPI**. This API will handle all the heavy lifting: loading data files, running the analysis, and performing calculations. It will expose an endpoint (e.g., `/api/predictions`) that the frontend can call.
2.  **Frontend (React App):** A new React application will be created. Its job is to provide the User Interface (UI), including filter inputs and sorting controls. When a user requests an analysis, the React app will call the Python backend, receive the prediction data as JSON, and display it in a powerful, interactive table.

Here is a comprehensive, step-by-step guide to achieve this.

---

### Part 1: Refactoring the Python Backend into a Web API (using FastAPI)

FastAPI is a modern, high-performance Python web framework that is extremely easy to use and automatically generates interactive documentation.

#### 1. Setup your Backend Environment

First, install FastAPI and an ASGI server like `uvicorn`.

```bash
pip install "fastapi[all]"
# Your existing requirements like pandas, numpy should already be installed
```

#### 2. Create the API file (`api_main.py`)

Create a new file `api_main.py` in the root of your project. This will be the entry point for your backend. We will adapt the logic from your `debug_main.py`.

**Key Changes:**
*   Data will be loaded **once** when the API starts, not on every request. This is crucial for performance.
*   The core analysis logic will be wrapped in an API endpoint.
*   The function `create_predictions_csv_enhanced` will be modified to return the list of prediction dictionaries as JSON instead of writing a file.

```python
# api_main.py
import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import pandas as pd
from typing import List, Dict, Any, Optional

# --- Import your existing modules ---
# Make sure all your .py files are in the same directory or accessible
from data_loader import initialize_data, get_last_n_games_performance
from analyzer import enhanced_hr_likelihood_score, calculate_recent_trends
from reporter import process_matchup_batch_file
from sort_utils import sort_predictions
from filter_utils import filter_predictions

# --- Initialize FastAPI App ---
app = FastAPI(
    title="Baseball HR Prediction API",
    description="API to generate HR predictions for MLB matchups."
)

# --- CORS Middleware ---
# This is CRITICAL to allow your React app (on a different port) to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # The default React dev server port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global State for Data ---
# Load all data into memory when the API starts up
DATA_CACHE = {}

@app.on_event("startup")
def load_data():
    print("--- API Startup: Initializing all data... ---")
    try:
        data_path = './data/'
        if not os.path.exists(data_path):
             raise FileNotFoundError(f"Data directory '{data_path}' not found.")
        
        years = [2022, 2023, 2024, 2025]
        (
            master_player_data, player_id_to_name_map, name_to_player_id_map,
            daily_game_data, rosters_data, historical_data,
            league_avg_stats, metric_ranges
        ) = initialize_data(data_path, years)

        DATA_CACHE['master_player_data'] = master_player_data
        DATA_CACHE['name_to_player_id_map'] = name_to_player_id_map
        DATA_CACHE['daily_game_data'] = daily_game_data
        DATA_CACHE['rosters_data'] = rosters_data
        DATA_CACHE['historical_data'] = historical_data
        DATA_CACHE['league_avg_stats'] = league_avg_stats
        DATA_CACHE['metric_ranges'] = metric_ranges
        
        print(f"--- Data Initialized Successfully: {len(master_player_data)} players loaded. ---")
    except Exception as e:
        print(f"FATAL ERROR during data initialization: {e}")
        # In a real app, you might want to prevent startup or handle this gracefully
        sys.exit(1)


# --- Re-implement the core logic as a reusable function ---
def get_matchup_predictions(pitcher_name: str, team_abbr: str) -> List[Dict[str, Any]]:
    # This logic is adapted from your process_pitcher_vs_team function
    
    # Use the pre-loaded data from the cache
    master_data = DATA_CACHE['master_player_data']
    name_map = DATA_CACHE['name_to_player_id_map']
    
    # This is a simplified version of your find_player_id_by_name logic
    pitcher_id = name_map.get(pitcher_name) # Assuming clean name for simplicity
    if not pitcher_id:
        # A more robust implementation would use your full find_player_id_by_name
        for pid, pdata in master_data.items():
            if pdata.get('roster_info', {}).get('fullName_resolved') == pitcher_name:
                pitcher_id = pid
                break
    
    if not pitcher_id:
        raise HTTPException(status_code=404, detail=f"Pitcher '{pitcher_name}' not found.")

    predictions = []
    
    for batter_id, batter_data in master_data.items():
        batter_roster_info = batter_data.get('roster_info', {})
        if batter_roster_info.get('type') == 'hitter' and batter_roster_info.get('team') == team_abbr:
            batter_full_name = batter_roster_info.get('fullName_resolved')
            
            try:
                batter_games, _ = get_last_n_games_performance(
                    batter_full_name, DATA_CACHE['daily_game_data'], DATA_CACHE['rosters_data']
                )
                batter_recent_trends = calculate_recent_trends(batter_games)
                
                prediction = enhanced_hr_likelihood_score(
                    batter_id, pitcher_id, master_data, 
                    DATA_CACHE['historical_data'], DATA_CACHE['metric_ranges'], 
                    DATA_CACHE['league_avg_stats'], batter_recent_trends
                )
                
                if prediction:
                    predictions.append(prediction)
            except Exception as e:
                print(f"Error processing hitter {batter_full_name}: {e}")

    return predictions

# --- API Endpoint Definition ---
@app.get("/api/predictions", response_model=List[Dict[str, Any]])
def run_analysis(pitcher_name: str, team_abbr: str):
    """
    Runs the HR prediction analysis for a given pitcher against a team.
    """
    if not DATA_CACHE:
        raise HTTPException(status_code=503, detail="Data is not yet loaded. Please try again in a moment.")

    try:
        # Get raw predictions
        all_predictions = get_matchup_predictions(pitcher_name, team_abbr)

        # Note: We return the raw, unsorted data. 
        # Sorting and filtering will be handled by the React frontend for interactivity.
        # Alternatively, you could accept sort/filter params here too.
        
        return all_predictions

    except HTTPException as he:
        raise he # Re-raise known HTTP exceptions
    except Exception as e:
        print(f"ERROR during analysis for {pitcher_name} vs {team_abbr}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="An internal error occurred during analysis.")

# --- To run the API ---
if __name__ == "__main__":
    # To run: uvicorn api_main:app --reload
    # The --reload flag automatically restarts the server when you save changes.
    uvicorn.run("api_main:app", host="127.0.0.1", port=8000, reload=True)
```

**To Run Your Backend:**
Open a terminal in your project directory and run:
`uvicorn api_main:app --reload`

Now, you can open your browser to `http://127.0.0.1:8000/docs`. FastAPI provides a beautiful, interactive API documentation page where you can test your endpoint!

---

### Part 2: Building the React Frontend Application

We'll use `create-react-app` for simplicity and **TanStack Table** (formerly React Table) for our powerful, interactive table. It's a "headless" library, meaning it provides the logic, and we provide the HTML/CSS, giving us full control over the look and feel.

#### 1. Setup your Frontend Environment

In a **new terminal window**, navigate to your project's root directory and run:

```bash
npx create-react-app frontend
cd frontend
npm install @tanstack/react-table
```

#### 2. Project Structure

Inside the `frontend/src` directory, we'll create a few components:
*   `App.js`: The main component to manage state and API calls.
*   `components/DataTable.js`: The reusable, interactive table component.
*   `components/Filters.js`: The component for all the filter controls.

#### 3. Building the Components

**`frontend/src/App.js`**

This is the main container. It fetches data and passes it down to the table.

```jsx
import React, { useState, useMemo } from 'react';
import DataTable from './components/DataTable';
import './App.css';

function App() {
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Example matchups
  const matchups = [
    { pitcher: 'MacKenzie Gore', team: 'SEA' },
    { pitcher: 'Sean Burke', team: 'TEX' },
    // Add more predefined matchups here
  ];

  const handleFetchPredictions = async (pitcher, team) => {
    setIsLoading(true);
    setError(null);
    setPredictions([]);

    try {
      // The API server is running on port 8000
      const response = await fetch(`http://localhost:8000/api/predictions?pitcher_name=${encodeURIComponent(pitcher)}&team_abbr=${team}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to fetch predictions');
      }
      const data = await response.json();
      setPredictions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Define columns for the table using TanStack Table's format
  // useMemo is used for performance, so it doesn't redefine on every render
  const columns = useMemo(() => [
    {
      header: 'Player',
      accessorKey: 'batter_name',
    },
    {
      header: 'Score',
      accessorKey: 'score',
      cell: info => info.getValue().toFixed(2), // Format the number
    },
    {
      header: 'HR Prob',
      accessorKey: 'outcome_probabilities.homerun',
      cell: info => `${info.getValue().toFixed(1)}%`,
    },
    {
      header: 'Hit Prob',
      accessorKey: 'outcome_probabilities.hit',
      cell: info => `${info.getValue().toFixed(1)}%`,
    },
    {
      header: 'K Prob',
      accessorKey: 'outcome_probabilities.strikeout',
      cell: info => `${info.getValue().toFixed(1)}%`,
    },
    {
      header: 'ABs Since HR',
      accessorKey: 'details.ab_since_last_hr',
    },
    {
      header: 'Contact Trend',
      accessorKey: 'details.contact_trend',
    },
     {
      header: 'PA (2025)',
      accessorKey: 'details.batter_pa_2025',
    },
  ], []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Baseball HR Predictions</h1>
        <div className="matchup-buttons">
          {matchups.map(m => (
            <button key={`${m.pitcher}-${m.team}`} onClick={() => handleFetchPredictions(m.pitcher, m.team)}>
              {m.pitcher} vs {m.team}
            </button>
          ))}
        </div>
      </header>
      <main>
        {isLoading && <p>Loading...</p>}
        {error && <p className="error">Error: {error}</p>}
        {predictions.length > 0 && <DataTable columns={columns} data={predictions} />}
      </main>
    </div>
  );
}

export default App;
```

**`frontend/src/components/DataTable.js`**

This is the core interactive table component.

```jsx
import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';

// A simple text input filter component
function Filter({ column }) {
  const columnFilterValue = column.getFilterValue();
  return (
    <input
      type="text"
      value={columnFilterValue ?? ''}
      onChange={e => column.setFilterValue(e.target.value)}
      placeholder={`Filter...`}
      className="filter-input"
    />
  );
}

const DataTable = ({ data, columns }) => {
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="table-container">
      <table>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} colSpan={header.colSpan}>
                  <div
                    className={header.column.getCanSort() ? 'sortable' : ''}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: ' 🔼',
                      desc: ' 🔽',
                    }[header.column.getIsSorted()] ?? null}
                  </div>
                  {header.column.getCanFilter() ? (
                    <div>
                      <Filter column={header.column} />
                    </div>
                  ) : null}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id}>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
```

**`frontend/src/App.css`** (Add some basic styling)

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  background-color: #f4f7f6;
  color: #333;
}

.App {
  text-align: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.App-header {
  background-color: #002d72;
  padding: 20px;
  color: white;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.matchup-buttons button {
  background-color: #fa4616;
  color: white;
  border: none;
  padding: 10px 20px;
  margin: 5px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.matchup-buttons button:hover {
  background-color: #d83c11;
}

.error {
  color: #d9534f;
  background-color: #f2dede;
  border: 1px solid #d9534f;
  padding: 15px;
  border-radius: 4px;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  font-size: 0.9rem;
  background-color: white;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
}

th, td {
  padding: 12px 15px;
  border: 1px solid #ddd;
  text-align: left;
}

thead {
  background-color: #e9ecef;
}

th {
  font-weight: bold;
}

th.sortable {
  cursor: pointer;
}

.filter-input {
  width: 90%;
  padding: 5px;
  margin-top: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
```

#### 4. Run the Frontend

In the terminal that's in the `frontend` directory, run:

```bash
npm start
```

Your browser should open to `http://localhost:3000`, and you'll see your application. Clicking one of the matchup buttons will call your Python API, fetch the data, and display it in the interactive table where you can now sort by clicking headers and filter by typing in the input boxes under each header.