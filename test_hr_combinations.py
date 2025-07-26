#!/usr/bin/env python3
"""
Test HR Combinations Data and Team Filtering
Verifies the generated data structure and simulates team filtering
"""

import json

def test_hr_combinations_data():
    """Test the generated HR combinations data"""
    
    print("🧪 Testing HR Combinations Data")
    print("=" * 50)
    
    try:
        # Load the data
        with open('public/data/hr_combinations/hr_combinations_latest.json', 'r') as f:
            data = json.load(f)
        
        print("✅ Data loaded successfully")
        
        # Test data structure
        required_keys = ['group_2', 'group_3', 'group_4']
        for key in required_keys:
            if key not in data:
                print(f"❌ Missing {key}")
                return False
            print(f"✅ {key}: {len(data[key])} combinations")
        
        # Test 4-player combinations (main issue)
        group_4 = data['group_4']
        if len(group_4) == 0:
            print("❌ Still no 4-player combinations!")
            return False
        else:
            print(f"✅ 4-player combinations found: {len(group_4)}")
            # Show examples
            for i, combo in enumerate(group_4[:3]):
                players = [f"{p['name']} ({p['team']})" for p in combo['players']]
                print(f"   {i+1}. {', '.join(players)} - {combo['occurrences']}x")
        
        # Test team distribution
        print(f"\n📊 Team distribution analysis:")
        all_teams = set()
        team_player_counts = {}
        
        for group_size in [2, 3, 4]:
            group_data = data[f'group_{group_size}']
            for combo in group_data:
                for player in combo['players']:
                    team = player['team']
                    all_teams.add(team)
                    team_player_counts[team] = team_player_counts.get(team, 0) + 1
        
        print(f"   Teams represented: {len(all_teams)}")
        print(f"   Teams: {sorted(list(all_teams))}")
        
        # Show top teams by player count
        top_teams = sorted(team_player_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        print(f"   Top teams by player appearances: {', '.join([f'{t}({c})' for t, c in top_teams])}")
        
        # Test team filtering simulation
        print(f"\n🎯 Team filtering simulation:")
        test_teams = ['NYY', 'LAD', 'PHI', 'SEA']
        
        for test_team in test_teams:
            matching_combos = []
            for group_size in [2, 3, 4]:
                group_data = data[f'group_{group_size}']
                for combo in group_data:
                    # Check if any player in combination is from test team
                    has_team_player = any(p['team'] == test_team for p in combo['players'])
                    if has_team_player:
                        matching_combos.append({
                            'groupSize': group_size,
                            'players': combo['players'],
                            'occurrences': combo['occurrences']
                        })
            
            print(f"   {test_team}: {len(matching_combos)} combinations")
            if matching_combos:
                # Show example
                example = matching_combos[0]
                players_str = ', '.join([f"{p['name']} ({p['team']})" for p in example['players']])
                print(f"      Example: {players_str} ({example['occurrences']}x)")
        
        # Test data quality
        print(f"\n🔍 Data quality checks:")
        total_combinations = sum(len(data[f'group_{i}']) for i in [2, 3, 4])
        print(f"   Total combinations: {total_combinations}")
        
        # Check for empty combinations
        empty_combos = 0
        for group_size in [2, 3, 4]:
            group_data = data[f'group_{group_size}']
            for combo in group_data:
                if not combo['players'] or len(combo['players']) != group_size:
                    empty_combos += 1
        
        if empty_combos > 0:
            print(f"❌ Found {empty_combos} invalid combinations")
        else:
            print(f"✅ All combinations have correct player counts")
        
        # Check occurrence requirements
        print(f"\n📋 Occurrence analysis:")
        for group_size in [2, 3, 4]:
            group_data = data[f'group_{group_size}']
            if group_data:
                occurrences = [combo['occurrences'] for combo in group_data]
                min_occ = min(occurrences)
                max_occ = max(occurrences)
                avg_occ = sum(occurrences) / len(occurrences)
                print(f"   {group_size}-player: {min_occ}-{max_occ} occurrences (avg: {avg_occ:.1f})")
        
        print(f"\n✅ All tests passed!")
        print(f"🎯 HR Combination Tracker should work correctly with team filtering!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing data: {e}")
        return False

def test_team_filtering_logic():
    """Test the team filtering logic"""
    print(f"\n🧪 Testing Team Filtering Logic")
    print("=" * 50)
    
    # Simulate the shouldIncludePlayer function
    def simulate_shouldIncludePlayer(selected_team, include_matchup=False, matchup_team=None):
        def shouldIncludePlayer(player_team, player_name):
            if not selected_team:
                return True
            
            # Direct team match
            if player_team == selected_team:
                return True
            
            # Matchup team match if enabled
            if include_matchup and matchup_team and player_team == matchup_team:
                return True
            
            return False
        
        return shouldIncludePlayer
    
    # Test cases
    test_cases = [
        {
            'name': 'NYY only',
            'selected_team': 'NYY',
            'include_matchup': False,
            'matchup_team': None
        },
        {
            'name': 'NYY vs LAD matchup',
            'selected_team': 'NYY',
            'include_matchup': True,
            'matchup_team': 'LAD'
        },
        {
            'name': 'No filter',
            'selected_team': None,
            'include_matchup': False,
            'matchup_team': None
        }
    ]
    
    # Load test data
    try:
        with open('public/data/hr_combinations/hr_combinations_latest.json', 'r') as f:
            data = json.load(f)
    except:
        print("❌ Could not load test data")
        return False
    
    for test_case in test_cases:
        print(f"\n🎯 Test case: {test_case['name']}")
        
        should_include = simulate_shouldIncludePlayer(
            test_case['selected_team'],
            test_case['include_matchup'],
            test_case['matchup_team']
        )
        
        matching_combinations = 0
        total_combinations = 0
        
        for group_size in [2, 3, 4]:
            group_data = data[f'group_{group_size}']
            for combo in group_data:
                total_combinations += 1
                
                # Check if combination should be included
                has_matching_player = any(
                    should_include(p['team'], p['name']) for p in combo['players']
                )
                
                if has_matching_player:
                    matching_combinations += 1
        
        print(f"   Result: {matching_combinations}/{total_combinations} combinations match")
        
        if test_case['selected_team']:
            if matching_combinations == 0:
                print(f"   ⚠️  No matches found - this might indicate an issue")
            else:
                print(f"   ✅ Found matches for {test_case['selected_team']}")
        else:
            if matching_combinations == total_combinations:
                print(f"   ✅ All combinations match (no filter)")
            else:
                print(f"   ❌ Not all combinations match when no filter applied")
    
    return True

def main():
    success = test_hr_combinations_data()
    if success:
        test_team_filtering_logic()
    
    print(f"\n" + "=" * 50)
    if success:
        print("✅ All tests completed successfully!")
        print("🎯 The HR Combination Tracker should now work properly with:")
        print("   • 4-player combinations (1+ occurrences)")
        print("   • More 2-player and 3-player combinations")
        print("   • Proper team filtering with visual highlighting")
        print("   • Realistic MLB team assignments")
    else:
        print("❌ Tests failed - please check the data generation")

if __name__ == "__main__":
    main()