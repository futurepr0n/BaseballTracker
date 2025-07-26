#!/usr/bin/env python3
"""
Optimized HR Combinations Generator
Fast and efficient HR combination analysis for BaseballTracker dashboard

Optimizations:
- Faster file processing with batch operations
- Memory efficient combination generation
- Early filtering to reduce memory usage
- Progress tracking and time estimates
"""

import json
import os
import sys
from datetime import datetime, timedelta
from itertools import combinations
from collections import defaultdict, Counter
import glob
import time

class OptimizedHRCombinationAnalyzer:
    def __init__(self):
        self.config = {
            'min_occurrences': {
                2: 2,  # 2-player combinations: 2+ times
                3: 2,  # 3-player combinations: 2+ times  
                4: 1   # 4-player combinations: 1+ times (more lenient)
            },
            'batch_size': 50,  # Process files in batches
            'min_hr_players_per_day': 2,  # Skip days with less than 2 HR players
            'max_combinations_preview': 1000  # Limit for progress reporting
        }
        
        self.stats = {
            'files_processed': 0,
            'files_with_hrs': 0,
            'total_hr_events': 0,
            'combinations_generated': defaultdict(int),
            'combinations_kept': defaultdict(int)
        }
        
        self.start_time = time.time()
        print("🚀 Optimized HR Combination Analyzer initialized")

    def find_data_files(self):
        """Find available data files with simple pattern matching"""
        patterns = [
            "public/data/2025/*/month_*_2025.json",
            "public/data/2025/*/*.json"
        ]
        
        files = []
        for pattern in patterns:
            found = glob.glob(pattern)
            files.extend(found)
        
        # Remove duplicates and sort
        unique_files = sorted(set(files))
        print(f"📁 Found {len(unique_files)} data files")
        return unique_files

    def quick_parse_file(self, file_path):
        """Quick parsing focused only on HR data"""
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            # Extract date from path
            import re
            date_match = re.search(r'month_(\d{2})_(\d{4})', file_path)
            if date_match:
                day, year = date_match.groups()
                # Get month from directory
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
                date_str = datetime.now().strftime('%Y-%m-%d')
            
            # Fast HR player extraction
            hr_players = []
            
            # Handle array data
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        hr_count = self.get_hr_count(item)
                        if hr_count > 0:
                            hr_players.append(self.extract_player_info(item, hr_count))
            
            # Handle dict data
            elif isinstance(data, dict):
                # Check common data keys
                for key in ['players', 'data', 'stats']:
                    if key in data and isinstance(data[key], list):
                        for item in data[key]:
                            if isinstance(item, dict):
                                hr_count = self.get_hr_count(item)
                                if hr_count > 0:
                                    hr_players.append(self.extract_player_info(item, hr_count))
                        break
            
            # Filter out invalid players
            valid_players = [p for p in hr_players if p['name'] != 'Unknown']
            
            self.stats['files_processed'] += 1
            if valid_players:
                self.stats['files_with_hrs'] += 1
                self.stats['total_hr_events'] += len(valid_players)
            
            return date_str, valid_players
            
        except Exception as e:
            # Silent error handling for speed
            return None, []

    def get_hr_count(self, player_data):
        """Extract HR count from player data"""
        for field in ['HR', 'hr', 'home_runs']:
            if field in player_data:
                try:
                    return int(player_data[field])
                except (ValueError, TypeError):
                    continue
        return 0

    def extract_player_info(self, player_data, hr_count):
        """Extract essential player information"""
        name = (player_data.get('name') or 
                player_data.get('Name') or 
                player_data.get('player_name') or 'Unknown')
        
        team = (player_data.get('team') or 
                player_data.get('Team') or 
                player_data.get('teamAbbr') or 'UNK')
        
        return {
            'name': name.strip(),
            'team': team.strip(),
            'hrCount': hr_count
        }

    def generate_day_combinations(self, hr_players, date_str):
        """Generate combinations for a single day with early filtering"""
        if len(hr_players) < 2:
            return {}
        
        day_combinations = {}
        
        for group_size in [2, 3, 4]:
            if len(hr_players) < group_size:
                continue
            
            combinations_list = []
            
            # Generate combinations efficiently
            for combo in combinations(hr_players, group_size):
                # Create sorted key for uniqueness
                player_keys = sorted([f"{p['name']}_{p['team']}" for p in combo])
                combo_key = "|".join(player_keys)
                
                total_hrs = sum(p['hrCount'] for p in combo)
                
                combinations_list.append({
                    'key': combo_key,
                    'players': list(combo),
                    'date': date_str,
                    'totalHRs': total_hrs
                })
                
                self.stats['combinations_generated'][group_size] += 1
            
            if combinations_list:
                day_combinations[group_size] = combinations_list
        
        return day_combinations

    def process_files_batch(self, file_batch):
        """Process a batch of files efficiently"""
        batch_combinations = defaultdict(list)
        
        for file_path in file_batch:
            date_str, hr_players = self.quick_parse_file(file_path)
            
            if not hr_players or len(hr_players) < self.config['min_hr_players_per_day']:
                continue
            
            day_combos = self.generate_day_combinations(hr_players, date_str)
            
            # Collect combinations by group size
            for group_size, combos in day_combos.items():
                batch_combinations[group_size].extend(combos)
        
        return batch_combinations

    def analyze_all_data(self):
        """Main analysis with batch processing"""
        print("🔍 Starting optimized HR combination analysis...")
        
        files = self.find_data_files()
        if not files:
            print("❌ No data files found!")
            return {}
        
        # Track combinations across all files
        all_combinations = defaultdict(lambda: defaultdict(list))
        
        # Process files in batches
        batch_size = self.config['batch_size']
        total_batches = (len(files) + batch_size - 1) // batch_size
        
        for batch_num in range(total_batches):
            start_idx = batch_num * batch_size
            end_idx = min(start_idx + batch_size, len(files))
            batch_files = files[start_idx:end_idx]
            
            print(f"📊 Processing batch {batch_num + 1}/{total_batches} ({len(batch_files)} files)...")
            
            batch_results = self.process_files_batch(batch_files)
            
            # Accumulate results
            for group_size, combinations in batch_results.items():
                for combo in combinations:
                    combo_key = combo['key']
                    all_combinations[group_size][combo_key].append(combo)
            
            # Progress update
            elapsed = time.time() - self.start_time
            if batch_num > 0:
                estimated_total = elapsed * total_batches / (batch_num + 1)
                remaining = estimated_total - elapsed
                print(f"   ⏱️  Progress: {((batch_num + 1) / total_batches * 100):.1f}% "
                      f"(ETA: {remaining/60:.1f} min)")
        
        print(f"✅ Processed {len(files)} files in {(time.time() - self.start_time):.1f} seconds")
        
        # Format final results
        return self.format_final_results(all_combinations)

    def format_final_results(self, all_combinations):
        """Format and filter final results"""
        print("📊 Formatting final results...")
        
        final_results = {}
        
        for group_size in [2, 3, 4]:
            print(f"   🎯 Processing {group_size}-player combinations...")
            
            min_occurrences = self.config['min_occurrences'][group_size]
            group_results = []
            
            combo_data = all_combinations.get(group_size, {})
            
            for combo_key, occurrences in combo_data.items():
                if len(occurrences) < min_occurrences:
                    continue
                
                # Calculate stats
                total_hrs = sum(occ['totalHRs'] for occ in occurrences)
                dates = [occ['date'] for occ in occurrences]
                latest_date = max(dates)
                
                # Calculate days since last
                try:
                    last_date = datetime.strptime(latest_date, '%Y-%m-%d')
                    days_since = (datetime.now() - last_date).days
                except:
                    days_since = 999
                
                # Use latest occurrence for player details
                latest_occ = max(occurrences, key=lambda x: x['date'])
                
                result = {
                    'combinationKey': combo_key,
                    'players': latest_occ['players'],
                    'occurrences': len(occurrences),
                    'totalHRs': total_hrs,
                    'dates': sorted(dates),
                    'lastOccurrence': latest_date,
                    'daysSinceLastOccurrence': days_since,
                    'averageHRs': round(total_hrs / len(occurrences), 1)
                }
                
                group_results.append(result)
                self.stats['combinations_kept'][group_size] += 1
            
            # Sort by frequency
            group_results.sort(key=lambda x: x['occurrences'], reverse=True)
            
            final_results[f'group_{group_size}'] = group_results
            
            print(f"   ✅ {group_size}-player: {len(group_results)} combinations "
                  f"(from {len(combo_data)} generated)")
        
        return final_results

    def create_output(self, results):
        """Create final output with metadata"""
        total_combinations = sum(len(results.get(f'group_{i}', [])) for i in [2, 3, 4])
        
        output = {
            'generatedAt': datetime.now().isoformat(),
            'generatedBy': 'Optimized HR Combination Analyzer v1.0',
            'processingTime': round(time.time() - self.start_time, 2),
            'dataSource': 'BaseballTracker 2025 Season',
            'configuration': self.config,
            'statistics': dict(self.stats),
            'totalCombinations': total_combinations
        }
        
        # Add results and metadata
        for group_size in [2, 3, 4]:
            group_key = f'group_{group_size}'
            group_data = results.get(group_key, [])
            output[group_key] = group_data
            
            # Add metadata
            output[f'{group_key}_metadata'] = {
                'count': len(group_data),
                'minOccurrences': self.config['min_occurrences'][group_size],
                'generatedTotal': self.stats['combinations_generated'][group_size],
                'keptAfterFiltering': self.stats['combinations_kept'][group_size],
                'topFrequency': group_data[0]['occurrences'] if group_data else 0,
                'averageFrequency': round(sum(c['occurrences'] for c in group_data) / len(group_data), 1) if group_data else 0
            }
        
        return output

    def save_output(self, output):
        """Save results to files"""
        # Create directory
        output_dir = "public/data/hr_combinations"
        os.makedirs(output_dir, exist_ok=True)
        
        # File paths
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        timestamped_file = f"{output_dir}/hr_combinations_{timestamp}.json"
        latest_file = f"{output_dir}/hr_combinations_latest.json"
        
        # Save files
        for file_path in [timestamped_file, latest_file]:
            with open(file_path, 'w') as f:
                json.dump(output, f, indent=2)
        
        # File size
        file_size = os.path.getsize(latest_file) / (1024 * 1024)
        
        print(f"💾 Results saved:")
        print(f"   📁 {latest_file}")
        print(f"   📊 Size: {file_size:.2f} MB")
        
        return latest_file

def main():
    print("🚀 Optimized HR Combination Analysis")
    print("=" * 50)
    
    analyzer = OptimizedHRCombinationAnalyzer()
    
    try:
        # Run analysis
        results = analyzer.analyze_all_data()
        
        if not results:
            print("❌ No results generated!")
            return
        
        # Create and save output
        output = analyzer.create_output(results)
        output_file = analyzer.save_output(output)
        
        # Summary
        print("\n" + "=" * 50)
        print("✅ Analysis Complete!")
        print(f"⏱️  Processing time: {output['processingTime']} seconds")
        print(f"📁 Files processed: {analyzer.stats['files_processed']}")
        print(f"📊 Summary:")
        print(f"   👥 2-player combinations: {len(output.get('group_2', []))}")
        print(f"   👥 3-player combinations: {len(output.get('group_3', []))}")
        print(f"   👥 4-player combinations: {len(output.get('group_4', []))}")
        
        # Show top examples
        for group_size in [2, 3, 4]:
            group_data = output.get(f'group_{group_size}', [])
            if group_data:
                top = group_data[0]
                names = [p['name'] for p in top['players']]
                print(f"   🔥 Top {group_size}-player: {', '.join(names)} ({top['occurrences']}x)")
        
        print(f"\n📁 Data ready: {output_file}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()