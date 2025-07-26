#!/usr/bin/env python3
"""
Enhanced HR Combinations Generator
Creates comprehensive home run combination analysis for the BaseballTracker dashboard

Improvements over previous version:
- Configurable minimum occurrences (lower for 4-player groups)
- Removes artificial limits on combination count
- Better metadata and filtering information
- Improved team filtering support
- Comprehensive logging and statistics
"""

import json
import os
import sys
from datetime import datetime, timedelta
from itertools import combinations
from collections import defaultdict, Counter
import glob

class EnhancedHRCombinationAnalyzer:
    def __init__(self):
        # Enhanced configuration
        self.config = {
            # Minimum occurrences by group size (more lenient for larger groups)
            'min_occurrences': {
                2: 2,  # 2-player combinations must occur at least 2 times
                3: 2,  # 3-player combinations must occur at least 2 times  
                4: 1   # 4-player combinations only need to occur once (they're rare)
            },
            # No artificial limits - show all combinations that meet criteria
            'max_combinations_per_group': None,
            
            # Analysis parameters
            'max_days_since_last': 365,  # Include combinations from entire season
            'min_hrs_per_combo': 2,     # Minimum total HRs in combination
            
            # Output configuration  
            'include_metadata': True,
            'include_debug_info': True
        }
        
        self.stats = {
            'dates_processed': 0,
            'games_with_hrs': 0,
            'total_hr_players': 0,
            'combinations_found': defaultdict(int),
            'combinations_filtered': defaultdict(int)
        }
        
        print("🚀 Enhanced HR Combination Analyzer initialized")
        print(f"📊 Configuration: {self.config}")

    def find_data_files(self):
        """Find all available MLB data files for 2025 season"""
        data_files = []
        base_path = "public/data"
        
        # Look for 2025 files in the year/month structure
        pattern = f"{base_path}/2025/*/month_*_2025.json"
        files = glob.glob(pattern)
        
        print(f"🔍 Found {len(files)} data files using pattern: {pattern}")
        
        # Also check for any other date-based files
        alt_patterns = [
            f"{base_path}/2025/*/*_2025.json",
            f"{base_path}/2025/*/*.json"
        ]
        
        for pattern in alt_patterns:
            alt_files = glob.glob(pattern)
            print(f"🔍 Alternative pattern {pattern}: {len(alt_files)} files")
            files.extend([f for f in alt_files if f not in files])
        
        # Sort files by date
        data_files = sorted(set(files))
        print(f"📁 Total unique data files found: {len(data_files)}")
        
        return data_files

    def load_game_data(self, file_path):
        """Load and parse game data from JSON file"""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            # Extract date from filename or data
            date_str = self.extract_date_from_file(file_path, data)
            
            # Find players who hit HRs
            hr_players = []
            
            # Handle different data structures
            if isinstance(data, list):
                # Array of players
                for player in data:
                    if self.has_home_run(player):
                        hr_players.append(self.normalize_player(player))
            elif isinstance(data, dict):
                # Check various possible keys
                possible_keys = ['players', 'data', 'stats', 'games']
                for key in possible_keys:
                    if key in data and isinstance(data[key], list):
                        for player in data[key]:
                            if self.has_home_run(player):
                                hr_players.append(self.normalize_player(player))
                        break
                else:
                    # If no list found, maybe it's a single game structure
                    if self.has_home_run(data):
                        hr_players.append(self.normalize_player(data))
            
            self.stats['dates_processed'] += 1
            if hr_players:
                self.stats['games_with_hrs'] += 1
                self.stats['total_hr_players'] += len(hr_players)
            
            return date_str, hr_players
            
        except Exception as e:
            print(f"⚠️  Error loading {file_path}: {e}")
            return None, []

    def extract_date_from_file(self, file_path, data):
        """Extract date from filename or data"""
        # Try to extract from filename first
        import re
        
        # Pattern for month_DD_YYYY.json
        pattern = r'month_(\d{2})_(\d{4})\.json'
        match = re.search(pattern, file_path)
        if match:
            day = match.group(1)
            year = match.group(2)
            
            # Extract month from directory path
            month_match = re.search(r'/(\w+)/', file_path)
            if month_match:
                month_name = month_match.group(1)
                month_map = {
                    'march': '03', 'april': '04', 'may': '05', 'june': '06',
                    'july': '07', 'august': '08', 'september': '09', 'october': '10'
                }
                month_num = month_map.get(month_name.lower(), '01')
                return f"{year}-{month_num}-{day}"
        
        # Fallback to other patterns or data content
        if isinstance(data, dict) and 'date' in data:
            return data['date']
        
        # Last resort: use current date
        return datetime.now().strftime('%Y-%m-%d')

    def has_home_run(self, player):
        """Check if player hit a home run"""
        if not isinstance(player, dict):
            return False
        
        # Check various HR field names
        hr_fields = ['HR', 'hr', 'home_runs', 'HomeRuns', 'homers']
        for field in hr_fields:
            if field in player:
                try:
                    hr_count = int(player[field])
                    return hr_count > 0
                except (ValueError, TypeError):
                    continue
        
        return False

    def normalize_player(self, player):
        """Normalize player data structure"""
        # Extract name
        name = (player.get('name') or player.get('Name') or 
                player.get('player_name') or player.get('playerName') or 
                player.get('Player') or 'Unknown')
        
        # Extract team
        team = (player.get('team') or player.get('Team') or 
                player.get('teamAbbr') or player.get('teamName') or 
                'UNK')
        
        # Extract HR count
        hr_count = 0
        hr_fields = ['HR', 'hr', 'home_runs', 'HomeRuns', 'homers']
        for field in hr_fields:
            if field in player:
                try:
                    hr_count = int(player[field])
                    break
                except (ValueError, TypeError):
                    continue
        
        return {
            'name': name,
            'team': team,
            'hrCount': hr_count
        }

    def generate_combinations(self, hr_players, group_size):
        """Generate all possible combinations of specified size"""
        if len(hr_players) < group_size:
            return []
        
        combos = []
        for combo in combinations(hr_players, group_size):
            # Create a unique key for this combination (order-independent)
            players_list = sorted([f"{p['name']}_{p['team']}" for p in combo])
            combo_key = "|".join(players_list)
            
            total_hrs = sum(p['hrCount'] for p in combo)
            
            combos.append({
                'key': combo_key,
                'players': list(combo),
                'totalHRs': total_hrs
            })
        
        return combos

    def analyze_historical_data(self):
        """Analyze historical HR combination data"""
        print("🔍 Starting historical HR combination analysis...")
        
        data_files = self.find_data_files()
        if not data_files:
            print("❌ No data files found!")
            return {}
        
        print(f"📊 Processing {len(data_files)} data files...")
        
        # Track combinations across all dates
        combination_tracker = defaultdict(list)  # combo_key -> list of dates/details
        
        for i, file_path in enumerate(data_files):
            if i % 20 == 0:
                print(f"📁 Processed {i}/{len(data_files)} files...")
            
            date_str, hr_players = self.load_game_data(file_path)
            if not hr_players or len(hr_players) < 2:
                continue
            
            # Generate combinations for all group sizes
            for group_size in [2, 3, 4]:
                combos = self.generate_combinations(hr_players, group_size)
                
                for combo in combos:
                    combination_tracker[combo['key']].append({
                        'date': date_str,
                        'totalHRs': combo['totalHRs'],
                        'players': combo['players']
                    })
        
        print(f"✅ Completed processing {len(data_files)} files")
        print(f"📊 Processing stats: {dict(self.stats)}")
        
        # Analyze and format results
        results = {}
        
        for group_size in [2, 3, 4]:
            print(f"\n🎯 Analyzing {group_size}-player combinations...")
            
            group_combinations = []
            min_occurrences = self.config['min_occurrences'][group_size]
            
            for combo_key, occurrences in combination_tracker.items():
                # Check if this combination is the right size
                players_in_combo = len(combo_key.split('|'))
                if players_in_combo != group_size:
                    continue
                
                # Check minimum occurrences
                if len(occurrences) < min_occurrences:
                    self.stats['combinations_filtered'][group_size] += 1
                    continue
                
                # Calculate statistics
                total_hrs = sum(occ['totalHRs'] for occ in occurrences)
                dates = [occ['date'] for occ in occurrences]
                latest_date = max(dates)
                
                # Calculate days since last occurrence
                try:
                    last_date = datetime.strptime(latest_date, '%Y-%m-%d')
                    days_since = (datetime.now() - last_date).days
                except:
                    days_since = 999
                
                # Use the latest occurrence for player details
                latest_occurrence = max(occurrences, key=lambda x: x['date'])
                
                combination_data = {
                    'combinationKey': combo_key,
                    'players': latest_occurrence['players'],
                    'occurrences': len(occurrences),
                    'totalHRs': total_hrs,
                    'dates': dates,
                    'lastOccurrence': latest_date,
                    'daysSinceLastOccurrence': days_since,
                    'averageHRs': round(total_hrs / len(occurrences), 1)
                }
                
                group_combinations.append(combination_data)
                self.stats['combinations_found'][group_size] += 1
            
            # Sort by occurrences (most frequent first)
            group_combinations.sort(key=lambda x: x['occurrences'], reverse=True)
            
            # Apply limits if configured (but we're removing artificial limits)
            max_combos = self.config['max_combinations_per_group']
            if max_combos and len(group_combinations) > max_combos:
                print(f"⚠️  Limiting {group_size}-player combinations to {max_combos} (from {len(group_combinations)})")
                group_combinations = group_combinations[:max_combos]
            
            results[f'group_{group_size}'] = group_combinations
            
            print(f"✅ {group_size}-player combinations: {len(group_combinations)} found, {self.stats['combinations_filtered'][group_size]} filtered")
        
        return results

    def create_comprehensive_output(self, combinations_data):
        """Create comprehensive output with metadata"""
        output = {
            'generatedAt': datetime.now().isoformat(),
            'generatedBy': 'Enhanced HR Combination Analyzer v2.0',
            'dataSource': 'BaseballTracker 2025 Season Data',
            'analysisConfig': self.config,
            'processingStats': dict(self.stats),
            'totalCombinations': sum(len(combinations_data.get(f'group_{i}', [])) for i in [2, 3, 4])
        }
        
        # Add group data
        for group_size in [2, 3, 4]:
            group_key = f'group_{group_size}'
            group_data = combinations_data.get(group_key, [])
            output[group_key] = group_data
            
            # Add group metadata
            output[f'{group_key}_metadata'] = {
                'count': len(group_data),
                'minOccurrences': self.config['min_occurrences'][group_size],
                'maxCombinations': self.config['max_combinations_per_group'] or 'unlimited',
                'totalFiltered': self.stats['combinations_filtered'][group_size],
                'averageOccurrences': round(sum(c['occurrences'] for c in group_data) / len(group_data), 1) if group_data else 0,
                'topOccurrences': group_data[0]['occurrences'] if group_data else 0
            }
        
        return output

    def save_results(self, output):
        """Save results to JSON file"""
        # Ensure output directory exists
        output_dir = "public/data/hr_combinations"
        os.makedirs(output_dir, exist_ok=True)
        
        # Save with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        timestamped_file = f"{output_dir}/hr_combinations_{timestamp}.json"
        
        # Save as latest
        latest_file = f"{output_dir}/hr_combinations_latest.json"
        
        # Write files
        with open(timestamped_file, 'w') as f:
            json.dump(output, f, indent=2)
        
        with open(latest_file, 'w') as f:
            json.dump(output, f, indent=2)
        
        # Calculate file size
        file_size = os.path.getsize(latest_file) / (1024 * 1024)  # MB
        
        print(f"💾 Results saved:")
        print(f"   📁 {timestamped_file}")
        print(f"   📁 {latest_file}")
        print(f"   📊 File size: {file_size:.2f} MB")
        
        return latest_file

def main():
    """Main execution function"""
    print("🚀 Starting Enhanced HR Combination Analysis...")
    print("=" * 60)
    
    analyzer = EnhancedHRCombinationAnalyzer()
    
    try:
        # Analyze historical data
        combinations_data = analyzer.analyze_historical_data()
        
        if not combinations_data:
            print("❌ No combination data generated!")
            return
        
        # Create comprehensive output
        output = analyzer.create_comprehensive_output(combinations_data)
        
        # Save results
        output_file = analyzer.save_results(output)
        
        # Print summary
        print("\n" + "=" * 60)
        print("✅ Enhanced HR Combination Analysis Complete!")
        print(f"📊 Summary:")
        print(f"   🎯 Total combinations found: {output['totalCombinations']}")
        print(f"   👥 2-player combinations: {len(output.get('group_2', []))}")
        print(f"   👥 3-player combinations: {len(output.get('group_3', []))}")
        print(f"   👥 4-player combinations: {len(output.get('group_4', []))}")
        print(f"   📁 Files processed: {analyzer.stats['dates_processed']}")
        print(f"   ⚾ Games with HRs: {analyzer.stats['games_with_hrs']}")
        print(f"   🏠 Total HR players: {analyzer.stats['total_hr_players']}")
        
        # Show top combinations
        for group_size in [2, 3, 4]:
            group_data = output.get(f'group_{group_size}', [])
            if group_data:
                top_combo = group_data[0]
                player_names = [p['name'] for p in top_combo['players']]
                print(f"   🔥 Top {group_size}-player: {', '.join(player_names)} ({top_combo['occurrences']} times)")
        
        print(f"\n📁 Data available at: {output_file}")
        print("🎯 HR Combination Tracker should now show comprehensive data!")
        
    except Exception as e:
        print(f"❌ Error during analysis: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()