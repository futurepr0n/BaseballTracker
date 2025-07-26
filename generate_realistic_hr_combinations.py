#!/usr/bin/env python3
"""
Generate Realistic HR Combinations Data
Creates HR combination data with actual MLB teams and realistic player names
This ensures team filtering works correctly with the dashboard team filter context
"""

import json
import os
from datetime import datetime, timedelta
import random

def get_mlb_teams():
    """Get actual MLB team abbreviations from teams.json"""
    try:
        with open('public/data/teams.json', 'r') as f:
            teams_data = json.load(f)
        return list(teams_data.keys())
    except:
        # Fallback to common MLB teams
        return [
            'NYY', 'LAD', 'PHI', 'SEA', 'CHC', 'SD', 'TOR', 'BOS', 
            'NYM', 'ATL', 'HOU', 'TB', 'MIN', 'CLE', 'BAL', 'TEX',
            'SF', 'COL', 'MIA', 'WSH', 'STL', 'MIL', 'CIN', 'PIT',
            'DET', 'KC', 'LAA', 'OAK', 'ARI', 'CHW'
        ]

def get_realistic_players():
    """Generate realistic player names with proper team assignments"""
    mlb_teams = get_mlb_teams()
    
    # Common first names and last names for realistic combinations
    first_names = [
        'Aaron', 'Alex', 'Anthony', 'Austin', 'Ben', 'Brandon', 'Bryce', 'Cal', 
        'Carlos', 'Christian', 'Cody', 'Corey', 'David', 'Eddie', 'Eric', 'Fernando',
        'Francisco', 'Gabriel', 'George', 'Hunter', 'Isaac', 'Jacob', 'Jake', 'James',
        'Jazz', 'Jose', 'Juan', 'Kyle', 'Luis', 'Marcus', 'Matt', 'Max',
        'Michael', 'Mike', 'Nick', 'Oscar', 'Paul', 'Pete', 'Rafael', 'Randy',
        'Roberto', 'Ronald', 'Ryan', 'Salvador', 'Steven', 'Tim', 'Tyler', 'Victor',
        'Vladimir', 'Will', 'Xander', 'Yordan', 'Zack'
    ]
    
    last_names = [
        'Alvarez', 'Anderson', 'Bellinger', 'Betts', 'Bogaerts', 'Chapman', 'Correa',
        'Cruz', 'Devers', 'Freeman', 'Garcia', 'Goldschmidt', 'Gonzalez', 'Guerrero',
        'Harper', 'Hernandez', 'Judge', 'Lopez', 'Machado', 'Martinez', 'Olson',
        'Ohtani', 'Perez', 'Ramirez', 'Rodriguez', 'Santana', 'Soto', 'Stanton',
        'Tatis', 'Turner', 'Vlad Jr.', 'Williams', 'Yelich', 'Alvarez'
    ]
    
    players = []
    
    # Generate 60 realistic players distributed across teams
    for _ in range(60):
        first = random.choice(first_names)
        last = random.choice(last_names)
        team = random.choice(mlb_teams)
        
        # Create realistic name format
        name = f"{first[0]}. {last}"
        
        players.append({
            'name': name,
            'team': team
        })
    
    return players

def create_realistic_combinations():
    """Create realistic HR combination data with proper team assignments"""
    
    players = get_realistic_players()
    
    # Generate sample dates over the season
    start_date = datetime(2025, 3, 28)  # Season start
    dates = []
    for i in range(150):  # 150 days of season
        dates.append((start_date + timedelta(days=i)).strftime('%Y-%m-%d'))
    
    def create_combination(players_list, occurrences, dates_list):
        """Create a combination entry with realistic data"""
        # Create combination key
        player_keys = sorted([f"{p['name']}_{p['team']}" for p in players_list])
        combo_key = "|".join(player_keys)
        
        # Select random dates for occurrences
        selected_dates = sorted(random.sample(dates_list[:120], min(occurrences, len(dates_list[:120]))))
        latest_date = max(selected_dates)
        
        # Calculate days since last occurrence
        last_date = datetime.strptime(latest_date, '%Y-%m-%d')
        days_since = (datetime.now() - last_date).days
        
        return {
            'combinationKey': combo_key,
            'players': players_list,
            'occurrences': occurrences,
            'totalHRs': occurrences * len(players_list) + random.randint(0, occurrences),  # Some players hit multiple HRs
            'dates': selected_dates,
            'lastOccurrence': latest_date,
            'daysSinceLastOccurrence': days_since,
            'averageHRs': round((occurrences * len(players_list) + random.randint(0, occurrences)) / occurrences, 1)
        }
    
    # Create the main data structure
    data = {
        'generatedAt': datetime.now().isoformat(),
        'generatedBy': 'Realistic HR Combinations Generator v1.0',
        'dataSource': 'BaseballTracker 2025 Season (Realistic Test Data)',
        'description': 'HR combinations with proper MLB team assignments for team filtering testing',
        'teamFilteringSupported': True,
        'notes': [
            'Uses actual MLB team abbreviations from teams.json',
            '4-player combinations: 1+ occurrences',
            '3-player combinations: 1+ occurrences', 
            '2-player combinations: 2+ occurrences',
            'Team filtering will show combinations where any player matches selected team'
        ]
    }
    
    # Generate 2-player combinations
    group_2 = []
    for _ in range(250):  # Generate 250 2-player combinations
        pair = random.sample(players, 2)
        occurrences = random.randint(2, 8)  # 2-8 occurrences
        group_2.append(create_combination(pair, occurrences, dates))
    
    # Sort by frequency
    group_2.sort(key=lambda x: x['occurrences'], reverse=True)
    group_2 = group_2[:200]  # Keep top 200
    
    # Generate 3-player combinations  
    group_3 = []
    for _ in range(180):  # Generate 180 3-player combinations
        trio = random.sample(players, 3)
        occurrences = random.randint(1, 3)  # 1-3 occurrences
        group_3.append(create_combination(trio, occurrences, dates))
    
    # Sort by frequency
    group_3.sort(key=lambda x: x['occurrences'], reverse=True)
    group_3 = group_3[:150]  # Keep top 150
    
    # Generate 4-player combinations
    group_4 = []
    for _ in range(60):  # Generate 60 4-player combinations
        quartet = random.sample(players, 4)
        occurrences = 1 if random.random() < 0.8 else 2  # Mostly 1 occurrence, some 2
        group_4.append(create_combination(quartet, occurrences, dates))
    
    # Sort by frequency
    group_4.sort(key=lambda x: x['occurrences'], reverse=True)
    group_4 = group_4[:30]  # Keep top 30
    
    # Add groups to data
    data['group_2'] = group_2
    data['group_3'] = group_3
    data['group_4'] = group_4
    
    # Add metadata
    for group_size in [2, 3, 4]:
        group_key = f'group_{group_size}'
        group_data = data[group_key]
        
        # Calculate team distribution for this group
        team_counts = {}
        for combo in group_data:
            for player in combo['players']:
                team = player['team']
                team_counts[team] = team_counts.get(team, 0) + 1
        
        data[f'{group_key}_metadata'] = {
            'count': len(group_data),
            'minOccurrences': 2 if group_size == 2 else 1,
            'maxOccurrences': max([c['occurrences'] for c in group_data]) if group_data else 0,
            'averageOccurrences': round(sum([c['occurrences'] for c in group_data]) / len(group_data), 1) if group_data else 0,
            'teamsRepresented': len(team_counts),
            'topTeams': sorted(team_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        }
    
    data['totalCombinations'] = len(group_2) + len(group_3) + len(group_4)
    
    return data

def save_data(data):
    """Save the data to files"""
    output_dir = "public/data/hr_combinations"
    os.makedirs(output_dir, exist_ok=True)
    
    # Save with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    timestamped_file = f"{output_dir}/hr_combinations_realistic_{timestamp}.json"
    
    # Save as latest
    latest_file = f"{output_dir}/hr_combinations_latest.json"
    
    # Write files
    for file_path in [timestamped_file, latest_file]:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    file_size = os.path.getsize(latest_file) / (1024 * 1024)
    
    print(f"💾 Data saved:")
    print(f"   📁 {latest_file}")
    print(f"   📊 Size: {file_size:.2f} MB")
    
    return latest_file

def main():
    print("🏟️ Realistic HR Combinations Generator")
    print("=" * 50)
    print("Creating data with proper MLB team assignments...")
    print()
    
    # Create realistic data
    data = create_realistic_combinations()
    
    # Save the data
    output_file = save_data(data)
    
    # Report results
    print("\n" + "=" * 50)
    print("✅ Realistic HR Combinations Generated!")
    print(f"📊 Results:")
    print(f"   👥 2-player combinations: {len(data['group_2'])}")
    print(f"   👥 3-player combinations: {len(data['group_3'])}")
    print(f"   👥 4-player combinations: {len(data['group_4'])}")
    print(f"   📁 Total combinations: {data['totalCombinations']}")
    
    # Show team distribution examples
    print(f"\n🏟️ Team distribution examples:")
    for group_size in [2, 3, 4]:
        metadata = data[f'group_{group_size}_metadata']
        top_teams = metadata['topTeams'][:3]
        print(f"   {group_size}-player: {metadata['teamsRepresented']} teams, top: {', '.join([f'{t}({c})' for t, c in top_teams])}")
    
    # Show sample combinations for each group
    print(f"\n🔥 Sample combinations:")
    for group_size in [2, 3, 4]:
        group_data = data[f'group_{group_size}']
        if group_data:
            sample = group_data[0]
            names_teams = [f"{p['name']} ({p['team']})" for p in sample['players']]
            print(f"   {group_size}-player: {', '.join(names_teams)} ({sample['occurrences']}x)")
    
    print(f"\n📁 Data ready: {output_file}")
    print("🎯 Team filtering should now work correctly with proper team assignments!")
    print("🎯 Try selecting a team filter to see combinations with players from that team!")

if __name__ == "__main__":
    main()