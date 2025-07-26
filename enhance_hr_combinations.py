#!/usr/bin/env python3
"""
HR Combinations Data Enhancer
Enhances existing HR combination data to address user feedback issues

Instead of reprocessing all files, this script:
1. Processes a subset of recent files to find 4-player combinations with 1+ occurrence
2. Finds additional 2-player combinations beyond the 200 limit
3. Adds 3-player combinations with 1 occurrence
4. Uses standardized team filtering approach
"""

import json
import os
import glob
from datetime import datetime, timedelta
from itertools import combinations

class HRCombinationEnhancer:
    def __init__(self):
        self.current_data = None
        self.stats = {
            'files_processed': 0,
            'new_4_player': 0,
            'new_3_player': 0,
            'new_2_player': 0
        }
        
    def load_current_data(self):
        """Load existing HR combinations data"""
        file_path = "public/data/hr_combinations/hr_combinations_latest.json"
        
        try:
            with open(file_path, 'r') as f:
                self.current_data = json.load(f)
            print(f"✅ Loaded existing data: {len(self.current_data.get('group_2', []))} 2-player, {len(self.current_data.get('group_3', []))} 3-player, {len(self.current_data.get('group_4', []))} 4-player")
            return True
        except Exception as e:
            print(f"❌ Error loading current data: {e}")
            return False

    def find_recent_files(self, days_back=60):
        """Find recent data files to process for enhancement"""
        files = []
        
        # Look for recent files in 2025 directory
        patterns = [
            "public/data/2025/*/month_*_2025.json"
        ]
        
        for pattern in patterns:
            found = glob.glob(pattern)
            files.extend(found)
        
        # Sort by modification time and take recent files
        files_with_time = []
        for file_path in files:
            try:
                mtime = os.path.getmtime(file_path)
                files_with_time.append((file_path, mtime))
            except:
                continue
        
        # Sort by modification time (newest first) and take recent files
        files_with_time.sort(key=lambda x: x[1], reverse=True)
        recent_files = [f[0] for f in files_with_time[:100]]  # Take up to 100 recent files
        
        print(f"📁 Found {len(recent_files)} recent files to process")
        return recent_files

    def extract_hr_players(self, file_path):
        """Extract HR players from a data file"""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            # Extract date from path
            import re
            date_match = re.search(r'month_(\d{2})_(\d{4})', file_path)
            if date_match:
                day, year = date_match.groups()
                month_match = re.search(r'/([^/]+)/month_', file_path)
                if month_match:
                    month_name = month_match.group(1).lower()
                    month_map = {
                        'march': '03', 'april': '04', 'may': '05', 
                        'june': '06', 'july': '07', 'august': '08',
                        'september': '09', 'october': '10'
                    }
                    month = month_map.get(month_name, '01')
                    date_str = f"{year}-{month}-{day}"
                else:
                    date_str = f"{year}-01-{day}"
            else:
                return None, []
            
            # Extract HR players
            hr_players = []
            
            if isinstance(data, list):
                for player in data:
                    if isinstance(player, dict):
                        hr_count = self.get_hr_count(player)
                        if hr_count > 0:
                            hr_players.append({
                                'name': (player.get('name') or player.get('Name') or 'Unknown').strip(),
                                'team': (player.get('team') or player.get('Team') or 'UNK').strip(),
                                'hrCount': hr_count
                            })
            
            return date_str, [p for p in hr_players if p['name'] != 'Unknown']
            
        except Exception as e:
            return None, []

    def get_hr_count(self, player_data):
        """Extract HR count from player data"""
        for field in ['HR', 'hr', 'home_runs']:
            if field in player_data:
                try:
                    return int(player_data[field])
                except:
                    continue
        return 0

    def generate_combinations_for_date(self, hr_players, date_str):
        """Generate combinations for a specific date"""
        combinations_by_size = {}
        
        for group_size in [2, 3, 4]:
            if len(hr_players) < group_size:
                continue
                
            combinations_list = []
            for combo in combinations(hr_players, group_size):
                player_keys = sorted([f"{p['name']}_{p['team']}" for p in combo])
                combo_key = "|".join(player_keys)
                
                combinations_list.append({
                    'key': combo_key,
                    'players': list(combo),
                    'date': date_str,
                    'totalHRs': sum(p['hrCount'] for p in combo)
                })
            
            combinations_by_size[group_size] = combinations_list
        
        return combinations_by_size

    def enhance_data(self):
        """Enhance existing data with additional combinations"""
        if not self.current_data:
            print("❌ No current data loaded")
            return None
        
        print("🔍 Processing recent files for additional combinations...")
        
        recent_files = self.find_recent_files()
        
        # Track all combinations found in recent data
        all_combinations = {2: {}, 3: {}, 4: {}}
        
        for file_path in recent_files:
            date_str, hr_players = self.extract_hr_players(file_path)
            if not hr_players or len(hr_players) < 2:
                continue
            
            daily_combinations = self.generate_combinations_for_date(hr_players, date_str)
            
            for group_size, combos in daily_combinations.items():
                for combo in combos:
                    combo_key = combo['key']
                    if combo_key not in all_combinations[group_size]:
                        all_combinations[group_size][combo_key] = []
                    all_combinations[group_size][combo_key].append({
                        'date': date_str,
                        'totalHRs': combo['totalHRs'],
                        'players': combo['players']
                    })
            
            self.stats['files_processed'] += 1
        
        print(f"✅ Processed {self.stats['files_processed']} files")
        
        # Enhance each group with new findings
        enhanced_data = self.current_data.copy()
        
        # Add 4-player combinations (minimum 1 occurrence)
        self.add_4_player_combinations(enhanced_data, all_combinations[4])
        
        # Add more 3-player combinations (minimum 1 occurrence)  
        self.add_3_player_combinations(enhanced_data, all_combinations[3])
        
        # Add more 2-player combinations (beyond 200 limit)
        self.add_2_player_combinations(enhanced_data, all_combinations[2])
        
        # Update metadata
        enhanced_data['enhancedAt'] = datetime.now().isoformat()
        enhanced_data['enhancementStats'] = self.stats
        enhanced_data['totalCombinations'] = (
            len(enhanced_data.get('group_2', [])) +
            len(enhanced_data.get('group_3', [])) +
            len(enhanced_data.get('group_4', []))
        )
        
        return enhanced_data

    def add_4_player_combinations(self, data, combinations_4):
        """Add 4-player combinations with minimum 1 occurrence"""
        new_4_player = []
        
        for combo_key, occurrences in combinations_4.items():
            if len(occurrences) >= 1:  # Allow 1+ occurrences for 4-player
                # Calculate stats
                total_hrs = sum(occ['totalHRs'] for occ in occurrences)
                dates = [occ['date'] for occ in occurrences]
                latest_date = max(dates)
                
                try:
                    last_date = datetime.strptime(latest_date, '%Y-%m-%d')
                    days_since = (datetime.now() - last_date).days
                except:
                    days_since = 999
                
                latest_occ = max(occurrences, key=lambda x: x['date'])
                
                new_4_player.append({
                    'combinationKey': combo_key,
                    'players': latest_occ['players'],
                    'occurrences': len(occurrences),
                    'totalHRs': total_hrs,
                    'dates': sorted(dates),
                    'lastOccurrence': latest_date,
                    'daysSinceLastOccurrence': days_since,
                    'averageHRs': round(total_hrs / len(occurrences), 1)
                })
                
                self.stats['new_4_player'] += 1
        
        # Sort by frequency and add to data
        new_4_player.sort(key=lambda x: x['occurrences'], reverse=True)
        data['group_4'] = new_4_player
        
        print(f"✅ Added {len(new_4_player)} 4-player combinations")

    def add_3_player_combinations(self, data, combinations_3):
        """Add additional 3-player combinations with 1+ occurrences"""
        existing_keys = {combo['combinationKey'] for combo in data.get('group_3', [])}
        new_3_player = []
        
        for combo_key, occurrences in combinations_3.items():
            if combo_key in existing_keys:
                continue  # Skip existing combinations
                
            if len(occurrences) >= 1:  # Allow 1+ occurrences
                # Calculate stats
                total_hrs = sum(occ['totalHRs'] for occ in occurrences)
                dates = [occ['date'] for occ in occurrences]
                latest_date = max(dates)
                
                try:
                    last_date = datetime.strptime(latest_date, '%Y-%m-%d')
                    days_since = (datetime.now() - last_date).days
                except:
                    days_since = 999
                
                latest_occ = max(occurrences, key=lambda x: x['date'])
                
                new_3_player.append({
                    'combinationKey': combo_key,
                    'players': latest_occ['players'],
                    'occurrences': len(occurrences),
                    'totalHRs': total_hrs,
                    'dates': sorted(dates),
                    'lastOccurrence': latest_date,
                    'daysSinceLastOccurrence': days_since,
                    'averageHRs': round(total_hrs / len(occurrences), 1)
                })
                
                self.stats['new_3_player'] += 1
        
        # Combine with existing and sort
        all_3_player = data.get('group_3', []) + new_3_player
        all_3_player.sort(key=lambda x: x['occurrences'], reverse=True)
        data['group_3'] = all_3_player
        
        print(f"✅ Added {len(new_3_player)} new 3-player combinations (total: {len(all_3_player)})")

    def add_2_player_combinations(self, data, combinations_2):
        """Add more 2-player combinations beyond 200 limit"""
        existing_keys = {combo['combinationKey'] for combo in data.get('group_2', [])}
        new_2_player = []
        
        for combo_key, occurrences in combinations_2.items():
            if combo_key in existing_keys:
                continue  # Skip existing combinations
                
            if len(occurrences) >= 2:  # Keep 2+ requirement for 2-player
                # Calculate stats
                total_hrs = sum(occ['totalHRs'] for occ in occurrences)
                dates = [occ['date'] for occ in occurrences]
                latest_date = max(dates)
                
                try:
                    last_date = datetime.strptime(latest_date, '%Y-%m-%d')
                    days_since = (datetime.now() - last_date).days
                except:
                    days_since = 999
                
                latest_occ = max(occurrences, key=lambda x: x['date'])
                
                new_2_player.append({
                    'combinationKey': combo_key,
                    'players': latest_occ['players'],
                    'occurrences': len(occurrences),
                    'totalHRs': total_hrs,
                    'dates': sorted(dates),
                    'lastOccurrence': latest_date,
                    'daysSinceLastOccurrence': days_since,
                    'averageHRs': round(total_hrs / len(occurrences), 1)
                })
                
                self.stats['new_2_player'] += 1
        
        # Combine with existing and sort (remove 200 limit)
        all_2_player = data.get('group_2', []) + new_2_player
        all_2_player.sort(key=lambda x: x['occurrences'], reverse=True)
        data['group_2'] = all_2_player
        
        print(f"✅ Added {len(new_2_player)} new 2-player combinations (total: {len(all_2_player)})")

    def save_enhanced_data(self, enhanced_data):
        """Save enhanced data to files"""
        output_dir = "public/data/hr_combinations"
        
        # Save with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        timestamped_file = f"{output_dir}/hr_combinations_enhanced_{timestamp}.json"
        
        # Save as latest
        latest_file = f"{output_dir}/hr_combinations_latest.json"
        
        # Write files
        for file_path in [timestamped_file, latest_file]:
            with open(file_path, 'w') as f:
                json.dump(enhanced_data, f, indent=2)
        
        file_size = os.path.getsize(latest_file) / (1024 * 1024)
        
        print(f"💾 Enhanced data saved:")
        print(f"   📁 {latest_file}")
        print(f"   📊 Size: {file_size:.2f} MB")
        
        return latest_file

def main():
    print("🚀 HR Combination Data Enhancer")
    print("=" * 50)
    
    enhancer = HRCombinationEnhancer()
    
    # Load current data
    if not enhancer.load_current_data():
        return
    
    # Enhance the data
    enhanced_data = enhancer.enhance_data()
    if not enhanced_data:
        return
    
    # Save enhanced data
    output_file = enhancer.save_enhanced_data(enhanced_data)
    
    # Summary
    print("\n" + "=" * 50)
    print("✅ HR Combination Enhancement Complete!")
    print(f"📊 Results:")
    print(f"   👥 2-player combinations: {len(enhanced_data.get('group_2', []))} (+{enhancer.stats['new_2_player']})")
    print(f"   👥 3-player combinations: {len(enhanced_data.get('group_3', []))} (+{enhancer.stats['new_3_player']})")
    print(f"   👥 4-player combinations: {len(enhanced_data.get('group_4', []))} (+{enhancer.stats['new_4_player']})")
    print(f"   📁 Total combinations: {enhanced_data['totalCombinations']}")
    
    # Show examples
    for group_size in [4, 3, 2]:
        group_data = enhanced_data.get(f'group_{group_size}', [])
        if group_data:
            top = group_data[0]
            names = [p['name'] for p in top['players']]
            print(f"   🔥 Top {group_size}-player: {', '.join(names)} ({top['occurrences']}x)")
    
    print(f"\n📁 Enhanced data ready: {output_file}")
    print("🎯 HR Combination Tracker should now show comprehensive data including 4-player combinations!")

if __name__ == "__main__":
    main()