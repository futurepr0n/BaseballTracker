#!/usr/bin/env python3
"""
Generate Real HR Combinations from Actual Player Data
Processes actual BaseballTracker player performance data to find legitimate HR combinations
"""

import json
import os
import glob
from datetime import datetime, timedelta
from itertools import combinations
from collections import defaultdict

class RealHRCombinationGenerator:
    def __init__(self):
        self.stats = {
            'files_processed': 0,
            'dates_with_hrs': 0,
            'total_hr_events': 0,
            'total_hr_players': 0,
            'combinations_found': defaultdict(int)
        }
        
        print("🏟️ Real HR Combinations Generator")
        print("Processing actual BaseballTracker player data...")

    def find_all_data_files(self):
        """Find all available data files in the 2025 directory structure"""
        patterns = [
            "public/data/2025/*/month_*_2025.json",
            "public/data/2025/*/*.json"
        ]
        
        files = []
        for pattern in patterns:
            found = glob.glob(pattern)
            files.extend(found)
        
        # Remove duplicates and filter out non-JSON files
        unique_files = []
        for f in files:
            if f.endswith('.json') and 'BAD' not in f:
                unique_files.append(f)
        
        unique_files = sorted(set(unique_files))
        print(f"📁 Found {len(unique_files)} data files to process")
        return unique_files

    def extract_date_from_filename(self, file_path):
        """Extract date from filename pattern"""
        import re
        
        # Extract month and day from path like "public/data/2025/july/july_25_2025.json"
        month_match = re.search(r'/([^/]+)/[^/]+_(\d{2})_2025\.json$', file_path)
        if month_match:
            month_name = month_match.group(1)
            day = month_match.group(2)
            
            month_map = {
                'march': '03', 'april': '04', 'may': '05', 'june': '06',
                'july': '07', 'august': '08', 'september': '09', 'october': '10'
            }
            
            month_num = month_map.get(month_name.lower(), '01')
            return f"2025-{month_num}-{day}"
        
        return None

    def load_player_performance_files(self):
        """Load actual player performance data from prediction files"""
        print("🔍 Looking for player performance data...")
        
        # Try to load from player_performance files which have actual player stats
        performance_files = glob.glob("public/data/predictions/player_performance_*.json")
        performance_files = [f for f in performance_files if 'latest' not in f]  # Skip latest file
        performance_files = sorted(performance_files)
        
        print(f"📊 Found {len(performance_files)} player performance files")
        
        hr_data_by_date = {}
        
        for file_path in performance_files:
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                
                file_date = data.get('date')
                if not file_date:
                    continue
                
                players_data = data.get('players', [])
                if not players_data:
                    continue
                
                # Find players who had recent HRs (within last few days of the file date)
                hr_players = []
                file_datetime = datetime.strptime(file_date, '%Y-%m-%d')
                
                for player in players_data:
                    last_hr_date = player.get('lastHRDate')
                    if last_hr_date:
                        try:
                            hr_datetime = datetime.strptime(last_hr_date, '%Y-%m-%d')
                            days_diff = (file_datetime - hr_datetime).days
                            
                            # If HR was very recent (same day or 1 day ago), consider it for this date
                            if days_diff <= 1:
                                hr_players.append({
                                    'name': player.get('name', player.get('fullName', 'Unknown')),
                                    'team': player.get('team', 'UNK'),
                                    'hrDate': last_hr_date,
                                    'homeRuns': player.get('homeRunsThisSeason', 1)
                                })
                        except:
                            continue
                
                if hr_players:
                    hr_data_by_date[file_date] = hr_players
                    self.stats['dates_with_hrs'] += 1
                    self.stats['total_hr_players'] += len(hr_players)
                
                self.stats['files_processed'] += 1
                
                if self.stats['files_processed'] % 20 == 0:
                    print(f"   Processed {self.stats['files_processed']} files...")
                    
            except Exception as e:
                continue
        
        print(f"✅ Processed {len(performance_files)} performance files")
        print(f"📊 Found {len(hr_data_by_date)} dates with HR data")
        return hr_data_by_date

    def load_hr_predictions_data(self):
        """Load HR data from HR prediction files"""
        print("🔍 Loading HR predictions data...")
        
        hr_files = glob.glob("public/data/predictions/hr_predictions_*.json")
        hr_files = [f for f in hr_files if 'latest' not in f]
        hr_files = sorted(hr_files)
        
        hr_data_by_date = {}
        
        for file_path in hr_files:
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                
                file_date = data.get('date')
                if not file_date:
                    continue
                
                predictions = data.get('predictions', [])
                if not predictions:
                    continue
                
                # Find players who had recent HRs
                hr_players = []
                
                for player in predictions:
                    last_hr_date = player.get('lastHRDate')
                    if last_hr_date:
                        try:
                            file_datetime = datetime.strptime(file_date, '%Y-%m-%d')
                            hr_datetime = datetime.strptime(last_hr_date, '%Y-%m-%d')
                            days_diff = (file_datetime - hr_datetime).days
                            
                            # If HR was very recent (same day), use it
                            if days_diff == 0:
                                hr_players.append({
                                    'name': player.get('name', player.get('fullName', 'Unknown')),
                                    'team': player.get('team', 'UNK'),
                                    'hrDate': last_hr_date,
                                    'homeRuns': player.get('homeRunsThisSeason', 1)
                                })
                        except:
                            continue
                
                if hr_players:
                    hr_data_by_date[file_date] = hr_players
                
            except Exception as e:
                continue
        
        print(f"✅ Processed {len(hr_files)} HR prediction files")
        return hr_data_by_date

    def generate_combinations_from_data(self, hr_data_by_date):
        """Generate HR combinations from the collected data"""
        print(f"🎯 Generating combinations from {len(hr_data_by_date)} dates with HR data...")
        
        combination_tracker = defaultdict(list)
        
        for date_str, hr_players in hr_data_by_date.items():
            if len(hr_players) < 2:
                continue
            
            print(f"   {date_str}: {len(hr_players)} players with HRs")
            for player in hr_players[:5]:  # Show first 5 players
                print(f"     - {player['name']} ({player['team']})")
            
            # Generate combinations for this date
            for group_size in [2, 3, 4]:
                if len(hr_players) < group_size:
                    continue
                
                for combo in combinations(hr_players, group_size):
                    # Create combination key
                    player_keys = sorted([f"{p['name']}_{p['team']}" for p in combo])
                    combo_key = "|".join(player_keys)
                    
                    combination_tracker[f"{group_size}_{combo_key}"].append({
                        'date': date_str,
                        'players': list(combo),
                        'totalHRs': sum(p.get('homeRuns', 1) for p in combo)
                    })
                    
                    self.stats['combinations_found'][group_size] += 1
        
        return combination_tracker

    def format_combinations(self, combination_tracker):
        """Format combinations into final data structure"""
        print("📋 Formatting combinations...")
        
        final_data = {
            'generatedAt': datetime.now().isoformat(),
            'generatedBy': 'Real HR Combinations Generator v1.0',
            'dataSource': 'BaseballTracker 2025 Player Performance Data',
            'description': 'Real MLB player HR combinations from actual game data',
            'processingStats': dict(self.stats)
        }
        
        for group_size in [2, 3, 4]:
            group_combinations = []
            
            # Filter combinations for this group size
            group_combos = {k: v for k, v in combination_tracker.items() if k.startswith(f"{group_size}_")}
            
            for combo_key, occurrences in group_combos.items():
                # Apply minimum occurrence requirements
                min_occurrences = 2 if group_size == 2 else 1
                
                if len(occurrences) >= min_occurrences:
                    # Calculate stats
                    dates = [occ['date'] for occ in occurrences]
                    latest_date = max(dates)
                    total_hrs = sum(occ['totalHRs'] for occ in occurrences)
                    
                    # Calculate days since last occurrence
                    try:
                        last_date = datetime.strptime(latest_date, '%Y-%m-%d')
                        days_since = (datetime.now() - last_date).days
                    except:
                        days_since = 999
                    
                    # Use latest occurrence for player details
                    latest_occ = max(occurrences, key=lambda x: x['date'])
                    
                    group_combinations.append({
                        'combinationKey': combo_key.replace(f"{group_size}_", ""),
                        'players': latest_occ['players'],
                        'occurrences': len(occurrences),
                        'totalHRs': total_hrs,
                        'dates': sorted(dates),
                        'lastOccurrence': latest_date,
                        'daysSinceLastOccurrence': days_since,
                        'averageHRs': round(total_hrs / len(occurrences), 1)
                    })
            
            # Sort by frequency
            group_combinations.sort(key=lambda x: x['occurrences'], reverse=True)
            
            # Limit to reasonable numbers
            limits = {2: 200, 3: 150, 4: 50}
            limit = limits.get(group_size, 100)
            group_combinations = group_combinations[:limit]
            
            final_data[f'group_{group_size}'] = group_combinations
            
            print(f"   {group_size}-player: {len(group_combinations)} combinations")
            if group_combinations:
                top = group_combinations[0]
                names = [p['name'] for p in top['players']]
                print(f"     Top: {', '.join(names)} ({top['occurrences']}x)")
        
        final_data['totalCombinations'] = sum(len(final_data.get(f'group_{i}', [])) for i in [2, 3, 4])
        
        return final_data

    def save_real_data(self, data):
        """Save the real HR combinations data"""
        output_dir = "public/data/hr_combinations"
        os.makedirs(output_dir, exist_ok=True)
        
        # Save with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        timestamped_file = f"{output_dir}/hr_combinations_real_{timestamp}.json"
        
        # Save as latest
        latest_file = f"{output_dir}/hr_combinations_latest.json"
        
        # Write files
        for file_path in [timestamped_file, latest_file]:
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
        
        file_size = os.path.getsize(latest_file) / (1024 * 1024)
        
        print(f"💾 Real data saved:")
        print(f"   📁 {latest_file}")
        print(f"   📊 Size: {file_size:.2f} MB")
        
        return latest_file

def main():
    print("🏟️ Generating Real HR Combinations from BaseballTracker Data")
    print("=" * 70)
    
    generator = RealHRCombinationGenerator()
    
    try:
        # Load player performance data
        performance_data = generator.load_player_performance_files()
        
        # Also load HR predictions data for additional coverage
        hr_predictions_data = generator.load_hr_predictions_data()
        
        # Merge the datasets
        all_hr_data = performance_data.copy()
        for date, players in hr_predictions_data.items():
            if date not in all_hr_data:
                all_hr_data[date] = players
            else:
                # Merge players, avoiding duplicates
                existing_players = {f"{p['name']}_{p['team']}" for p in all_hr_data[date]}
                for player in players:
                    player_key = f"{player['name']}_{player['team']}"
                    if player_key not in existing_players:
                        all_hr_data[date].append(player)
        
        print(f"📊 Combined data: {len(all_hr_data)} dates with HR data")
        
        if not all_hr_data:
            print("❌ No HR data found!")
            return
        
        # Generate combinations
        combination_tracker = generator.generate_combinations_from_data(all_hr_data)
        
        if not combination_tracker:
            print("❌ No combinations found!")
            return
        
        # Format and save results
        final_data = generator.format_combinations(combination_tracker)
        output_file = generator.save_real_data(final_data)
        
        # Summary
        print("\n" + "=" * 70)
        print("✅ Real HR Combinations Generated!")
        print(f"📊 Results from actual BaseballTracker data:")
        print(f"   👥 2-player combinations: {len(final_data.get('group_2', []))}")
        print(f"   👥 3-player combinations: {len(final_data.get('group_3', []))}")
        print(f"   👥 4-player combinations: {len(final_data.get('group_4', []))}")
        print(f"   📁 Total: {final_data['totalCombinations']} real combinations")
        
        # Show real examples
        print(f"\n🔥 Real player examples:")
        for group_size in [2, 3, 4]:
            group_data = final_data.get(f'group_{group_size}', [])
            if group_data:
                example = group_data[0]
                names = [f"{p['name']} ({p['team']})" for p in example['players']]
                print(f"   {group_size}-player: {', '.join(names)} ({example['occurrences']}x)")
        
        print(f"\n📁 Real data available: {output_file}")
        print("🎯 These are actual MLB players from your BaseballTracker system!")
        
    except Exception as e:
        print(f"❌ Error generating real combinations: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()