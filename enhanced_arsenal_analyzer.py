#!/usr/bin/env python3
"""
Enhanced Arsenal Analysis for Weakspot Exploiters
Provides detailed pitch-by-pitch breakdowns with statistical evidence
"""
import csv
import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# Import centralized configuration
sys.path.append(str(Path(__file__).parent.parent / 'BaseballScraper'))
from config import PATHS, DATA_PATH

class EnhancedArsenalAnalyzer:
    """Provides detailed arsenal analysis with specific statistical evidence"""
    
    def __init__(self, stats_path: str):
        self.stats_path = Path(stats_path)
        self.league_averages = self._calculate_league_averages()
        
    def _calculate_league_averages(self) -> Dict[str, Dict[str, float]]:
        """Calculate league averages by pitch type for context"""
        pitch_stats = {}
        total_counts = {}
        
        file_path = self.stats_path / "pitcherpitcharsenalstats_2025.csv"
        if not file_path.exists():
            return {}
            
        try:
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                
                for row in reader:
                    pitch_type = row['pitch_type']
                    if pitch_type not in pitch_stats:
                        pitch_stats[pitch_type] = {
                            'ba_total': 0, 'slg_total': 0, 'woba_total': 0,
                            'whiff_total': 0, 'hard_hit_total': 0, 'usage_total': 0
                        }
                        total_counts[pitch_type] = 0
                    
                    # Accumulate stats
                    pitch_stats[pitch_type]['ba_total'] += float(row.get('ba', 0))
                    pitch_stats[pitch_type]['slg_total'] += float(row.get('slg', 0))
                    pitch_stats[pitch_type]['woba_total'] += float(row.get('woba', 0))
                    pitch_stats[pitch_type]['whiff_total'] += float(row.get('whiff_percent', 0))
                    pitch_stats[pitch_type]['hard_hit_total'] += float(row.get('hard_hit_percent', 0))
                    pitch_stats[pitch_type]['usage_total'] += float(row.get('pitch_usage', 0))
                    total_counts[pitch_type] += 1
                    
        except Exception as e:
            print(f"Error calculating league averages: {e}")
            return {}
        
        # Calculate averages
        league_avgs = {}
        for pitch_type, stats in pitch_stats.items():
            if total_counts[pitch_type] > 0:
                count = total_counts[pitch_type]
                league_avgs[pitch_type] = {
                    'ba_avg': stats['ba_total'] / count,
                    'slg_avg': stats['slg_total'] / count,
                    'woba_avg': stats['woba_total'] / count,
                    'whiff_avg': stats['whiff_total'] / count,
                    'hard_hit_avg': stats['hard_hit_total'] / count,
                    'usage_avg': stats['usage_total'] / count
                }
        
        return league_avgs

    def analyze_pitcher_arsenal_detailed(self, pitcher_name: str, pitcher_arsenal: Dict) -> Dict:
        """Provide detailed arsenal analysis with statistical context"""
        if pitcher_name not in pitcher_arsenal:
            return {'arsenal_analysis': 'No arsenal data available'}
        
        arsenal_data = pitcher_arsenal[pitcher_name]
        detailed_analysis = {
            'pitch_breakdown': [],
            'vulnerability_summary': '',
            'exploitation_opportunities': [],
            'usage_vs_effectiveness': [],
            'league_context': []
        }
        
        vulnerabilities = []
        opportunities = []
        
        for pitch_type, pitch_data in arsenal_data['pitch_types'].items():
            pitch_analysis = self._analyze_individual_pitch(pitch_type, pitch_data)
            detailed_analysis['pitch_breakdown'].append(pitch_analysis)
            
            # Check for vulnerabilities
            if pitch_analysis['vulnerability_score'] >= 60:
                vulnerabilities.append(pitch_analysis)
                opportunities.extend(pitch_analysis['exploitation_factors'])
        
        # Generate comprehensive summary
        detailed_analysis['vulnerability_summary'] = self._generate_vulnerability_summary(vulnerabilities)
        detailed_analysis['exploitation_opportunities'] = opportunities[:3]  # Top 3
        
        return detailed_analysis
    
    def _analyze_individual_pitch(self, pitch_type: str, pitch_data: Dict) -> Dict:
        """Analyze individual pitch with league context"""
        pitch_name = pitch_data['pitch_name']
        usage = pitch_data['usage']
        ba_against = pitch_data['ba_against']
        slg_against = pitch_data['slg_against']
        woba_against = pitch_data['woba_against']
        whiff_percent = pitch_data['whiff_percent']
        hard_hit_percent = pitch_data['hard_hit_percent']
        
        # Get league averages for context
        league_avg = self.league_averages.get(pitch_type, {})
        
        analysis = {
            'pitch_name': pitch_name,
            'pitch_type': pitch_type,
            'usage_percent': usage,
            'effectiveness_metrics': {
                'ba_against': ba_against,
                'slg_against': slg_against,
                'woba_against': woba_against,
                'whiff_percent': whiff_percent,
                'hard_hit_percent': hard_hit_percent
            },
            'league_comparison': {},
            'vulnerability_score': 0,
            'exploitation_factors': [],
            'detailed_justification': ''
        }
        
        # Calculate league comparison
        if league_avg:
            analysis['league_comparison'] = {
                'ba_vs_league': ((ba_against - league_avg.get('ba_avg', ba_against)) / league_avg.get('ba_avg', 1)) * 100,
                'slg_vs_league': ((slg_against - league_avg.get('slg_avg', slg_against)) / league_avg.get('slg_avg', 1)) * 100,
                'whiff_vs_league': ((whiff_percent - league_avg.get('whiff_avg', whiff_percent)) / league_avg.get('whiff_avg', 1)) * 100,
                'hard_hit_vs_league': ((hard_hit_percent - league_avg.get('hard_hit_avg', hard_hit_percent)) / league_avg.get('hard_hit_avg', 1)) * 100
            }
        
        # Calculate vulnerability score and factors
        vulnerability_score = 0
        factors = []
        
        # BA Against Analysis
        if ba_against > 0.300:
            vulnerability_score += 25
            factors.append(f"Extremely hittable {pitch_name} (.{int(ba_against*1000)} BA vs .{int(league_avg.get('ba_avg', 0.250)*1000)} league avg)")
        elif ba_against > 0.280:
            vulnerability_score += 20
            factors.append(f"Very hittable {pitch_name} (.{int(ba_against*1000)} BA)")
        elif ba_against > 0.260:
            vulnerability_score += 15
            factors.append(f"Above average hittability (.{int(ba_against*1000)} BA)")
        
        # SLG Against Analysis
        if slg_against > 0.550:
            vulnerability_score += 20
            factors.append(f"Power vulnerable {pitch_name} (.{int(slg_against*1000)} SLG allowed)")
        elif slg_against > 0.480:
            vulnerability_score += 15
            factors.append(f"Above average power allowed (.{int(slg_against*1000)} SLG)")
        
        # Whiff Rate Analysis (lower is worse for pitcher)
        if whiff_percent < 20:
            vulnerability_score += 15
            factors.append(f"Poor swing-and-miss {pitch_name} ({whiff_percent:.1f}% whiff rate)")
        elif whiff_percent < 25:
            vulnerability_score += 10
            factors.append(f"Below average whiff rate ({whiff_percent:.1f}%)")
        
        # Hard Hit Analysis
        if hard_hit_percent > 45:
            vulnerability_score += 15
            factors.append(f"Hard contact allowed ({hard_hit_percent:.1f}% hard hit rate)")
        elif hard_hit_percent > 40:
            vulnerability_score += 10
            factors.append(f"Above average hard contact ({hard_hit_percent:.1f}%)")
        
        # Usage vs Effectiveness
        if usage > 30 and ba_against > 0.270:
            vulnerability_score += 20
            factors.append(f"Over-relied ineffective pitch ({usage:.1f}% usage, .{int(ba_against*1000)} BA)")
        elif usage > 25 and ba_against > 0.250:
            vulnerability_score += 15
            factors.append(f"High usage vulnerable pitch ({usage:.1f}% usage)")
        
        analysis['vulnerability_score'] = min(vulnerability_score, 100)
        analysis['exploitation_factors'] = factors
        
        # Generate detailed justification
        analysis['detailed_justification'] = self._generate_pitch_justification(analysis)
        
        return analysis
    
    def _generate_pitch_justification(self, analysis: Dict) -> str:
        """Generate detailed statistical justification for pitch vulnerability"""
        pitch_name = analysis['pitch_name']
        usage = analysis['usage_percent']
        metrics = analysis['effectiveness_metrics']
        league_comp = analysis['league_comparison']
        
        justification_parts = []
        
        # Usage context
        if usage > 35:
            justification_parts.append(f"Primary pitch ({usage:.1f}% usage)")
        elif usage > 25:
            justification_parts.append(f"Secondary pitch ({usage:.1f}% usage)")
        else:
            justification_parts.append(f"Occasional pitch ({usage:.1f}% usage)")
        
        # Effectiveness analysis
        ba_against = metrics['ba_against']
        slg_against = metrics['slg_against']
        whiff_percent = metrics['whiff_percent']
        
        if ba_against > 0.280:
            justification_parts.append(f"allows .{int(ba_against*1000)} BA")
        if slg_against > 0.480:
            justification_parts.append(f".{int(slg_against*1000)} SLG")
        if whiff_percent < 25:
            justification_parts.append(f"only {whiff_percent:.1f}% whiffs")
        
        # League context
        if league_comp:
            ba_diff = league_comp.get('ba_vs_league', 0)
            if ba_diff > 15:
                justification_parts.append(f"{ba_diff:.0f}% worse than league average")
            elif ba_diff > 8:
                justification_parts.append(f"above average hittability")
        
        return f"{pitch_name}: " + " | ".join(justification_parts)
    
    def _generate_vulnerability_summary(self, vulnerabilities: List[Dict]) -> str:
        """Generate summary of main vulnerabilities"""
        if not vulnerabilities:
            return "No significant pitch vulnerabilities identified"
        
        # Sort by vulnerability score
        vulnerabilities.sort(key=lambda x: x['vulnerability_score'], reverse=True)
        
        top_vulnerability = vulnerabilities[0]
        pitch_name = top_vulnerability['pitch_name']
        score = top_vulnerability['vulnerability_score']
        usage = top_vulnerability['usage_percent']
        ba = top_vulnerability['effectiveness_metrics']['ba_against']
        
        summary = f"Primary weakness: {pitch_name} "
        summary += f"({usage:.1f}% usage, .{int(ba*1000)} BA against, {score}/100 vulnerability)"
        
        if len(vulnerabilities) > 1:
            secondary = vulnerabilities[1]
            summary += f" | Secondary: {secondary['pitch_name']} weakness"
        
        return summary

    def generate_enhanced_situational_justification(self, batter_data: Dict, pitcher_arsenal_analysis: Dict) -> str:
        """Generate specific situational justification based on batter profile and pitcher weaknesses"""
        
        # Extract batter characteristics
        z_swing = batter_data.get('z_swing_percent', 0)
        oz_swing = batter_data.get('oz_swing_percent', 0)
        bb_rate = batter_data.get('bb_percent', 0)
        barrel_rate = batter_data.get('barrel_percent', 0)
        hard_hit = batter_data.get('hard_hit_percent', 0)
        whiff_rate = batter_data.get('whiff_percent', 0)
        
        # Get top pitch vulnerability
        pitch_breakdown = pitcher_arsenal_analysis.get('pitch_breakdown', [])
        if not pitch_breakdown:
            return "Limited arsenal data available"
        
        # Find most vulnerable pitch
        vulnerable_pitch = max(pitch_breakdown, key=lambda x: x['vulnerability_score'])
        pitch_name = vulnerable_pitch['pitch_name']
        vulnerability_score = vulnerable_pitch['vulnerability_score']
        
        # Generate specific justification based on batter type and pitch weakness
        justifications = []
        
        # Aggressive vs Zone Pitches
        if z_swing > 75:
            justifications.append(f"Zone aggressive hitter ({z_swing:.1f}% zone swing) vs {pitch_name} weakness")
        elif z_swing > 60:
            justifications.append(f"Above average zone aggression ({z_swing:.1f}%) vs vulnerable {pitch_name}")
        
        # Discipline vs Wild Pitchers
        if oz_swing < 25 and bb_rate > 12:
            justifications.append(f"Elite plate discipline ({oz_swing:.1f}% chase, {bb_rate:.1f}% BB rate)")
        
        # Power vs Contact-Vulnerable Pitches
        if barrel_rate > 8 and vulnerable_pitch['effectiveness_metrics']['ba_against'] > 0.280:
            justifications.append(f"Power threat ({barrel_rate:.1f}% barrels) vs contact-vulnerable {pitch_name}")
        
        # Contact vs Whiff-Poor Pitches
        if whiff_rate < 20 and vulnerable_pitch['effectiveness_metrics']['whiff_percent'] < 25:
            justifications.append(f"Contact specialist ({whiff_rate:.1f}% whiff) vs ineffective {pitch_name}")
        
        # Usage exploitation
        usage = vulnerable_pitch['usage_percent']
        if usage > 30:
            justifications.append(f"Over-reliance on weak {pitch_name} ({usage:.1f}% usage)")
        
        # Combine justifications
        if justifications:
            main_justification = justifications[0]
            if len(justifications) > 1:
                main_justification += f" | {justifications[1]}"
            return main_justification
        else:
            # Fallback generic justification
            return f"Batter profile vs {pitch_name} vulnerability ({vulnerability_score}/100 exploit potential)"

def enhance_weakspot_justifications(stats_path: str, exploiters_data: List[Dict]) -> List[Dict]:
    """Enhance existing exploiters with detailed arsenal justifications"""
    
    analyzer = EnhancedArsenalAnalyzer(stats_path)
    
    # Load pitcher arsenal data
    pitcher_arsenal = {}
    file_path = Path(stats_path) / "pitcherpitcharsenalstats_2025.csv"
    
    if file_path.exists():
        try:
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                
                for row in reader:
                    pitcher_name = row['last_name, first_name'].lower()
                    
                    if pitcher_name not in pitcher_arsenal:
                        pitcher_arsenal[pitcher_name] = {
                            'team': row.get('team_name_alt', ''),
                            'pitch_types': {}
                        }
                    
                    pitch_type = row['pitch_type']
                    pitch_data = {
                        'pitch_name': row['pitch_name'],
                        'usage': float(row.get('pitch_usage', 0)),
                        'ba_against': float(row.get('ba', 0)),
                        'slg_against': float(row.get('slg', 0)),
                        'woba_against': float(row.get('woba', 0)),
                        'whiff_percent': float(row.get('whiff_percent', 0)),
                        'hard_hit_percent': float(row.get('hard_hit_percent', 0)),
                    }
                    
                    pitcher_arsenal[pitcher_name]['pitch_types'][pitch_type] = pitch_data
                    
        except Exception as e:
            print(f"Error loading pitcher arsenal: {e}")
    
    # Load batter data
    batter_data = {}
    batter_file = Path(stats_path) / "custom_batter_2025.csv"
    
    if batter_file.exists():
        try:
            with open(batter_file, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                
                for row in reader:
                    batter_name = row['last_name, first_name'].lower()
                    batter_data[batter_name] = {
                        'z_swing_percent': float(row.get('z_swing_percent', 0)),
                        'oz_swing_percent': float(row.get('oz_swing_percent', 0)),
                        'bb_percent': float(row.get('bb_percent', 0)),
                        'barrel_percent': float(row.get('barrel_percent', 0)),
                        'hard_hit_percent': float(row.get('hard_hit_percent', 0)),
                        'whiff_percent': float(row.get('whiff_percent', 0))
                    }
                    
        except Exception as e:
            print(f"Error loading batter data: {e}")
    
    # Enhance each exploiter
    enhanced_exploiters = []
    
    for exploiter in exploiters_data:
        enhanced_exploiter = exploiter.copy()
        
        pitcher_name = exploiter.get('pitcher', '').lower()
        batter_name = exploiter.get('batter', '').lower()
        
        # Get detailed arsenal analysis
        arsenal_analysis = analyzer.analyze_pitcher_arsenal_detailed(pitcher_name, pitcher_arsenal)
        
        # Get batter profile
        batter_profile = batter_data.get(batter_name, {})
        
        # Generate enhanced justification
        if arsenal_analysis.get('pitch_breakdown') and batter_profile:
            enhanced_justification = analyzer.generate_enhanced_situational_justification(
                batter_profile, arsenal_analysis
            )
            enhanced_exploiter['enhanced_arsenal_justification'] = enhanced_justification
            enhanced_exploiter['arsenal_breakdown'] = arsenal_analysis['vulnerability_summary']
            enhanced_exploiter['top_exploitation_factors'] = arsenal_analysis.get('exploitation_opportunities', [])
        
        enhanced_exploiters.append(enhanced_exploiter)
    
    return enhanced_exploiters

if __name__ == "__main__":
    # Test the analyzer
    stats_path = DATA_PATH / "stats"
    
    # Debug: Check if files exist
    arsenal_file = Path(stats_path) / "pitcherpitcharsenalstats_2025.csv"
    batter_file = Path(stats_path) / "custom_batter_2025.csv"
    
    print(f"Arsenal file exists: {arsenal_file.exists()}")
    print(f"Batter file exists: {batter_file.exists()}")
    
    if arsenal_file.exists():
        print(f"Arsenal file path: {arsenal_file}")
        # Test with actual names from the file
        with open(arsenal_file, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            sample_row = next(reader)
            print(f"Sample pitcher: {sample_row['last_name, first_name']}")
    
    if batter_file.exists():
        print(f"Batter file path: {batter_file}")
        # Test with actual names from the file  
        with open(batter_file, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            sample_row = next(reader)
            print(f"Sample batter: {sample_row['last_name, first_name']}")
    
    # Load sample exploiters data for testing with real names
    sample_exploiters = [
        {
            "batter": "torres, gleyber", 
            "pitcher": "pfaadt, brandon",
            "exploitIndex": 112.9,
            "situationalAdvantages": ["First pitch hunter vs vulnerable fastball"]
        }
    ]
    
    enhanced = enhance_weakspot_justifications(stats_path, sample_exploiters)
    
    print("\nEnhanced Arsenal Analysis:")
    for exploiter in enhanced:
        print(f"\n{exploiter['batter']} vs {exploiter['pitcher']}:")
        print(f"  Enhanced Justification: {exploiter.get('enhanced_arsenal_justification', 'N/A')}")
        print(f"  Arsenal Breakdown: {exploiter.get('arsenal_breakdown', 'N/A')}")
        print(f"  Top Factors: {exploiter.get('top_exploitation_factors', [])}")