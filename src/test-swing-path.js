// Quick test script to validate swing path data loading
import swingPathService from './services/swingPathService';

const testSwingPathService = async () => {
  console.log('🧪 Testing Swing Path Service...');
  
  try {
    // Test loading RHP data
    console.log('Loading RHP data...');
    const rhpData = await swingPathService.loadSwingPathData('RHP');
    console.log(`RHP data loaded: ${rhpData.size} players`);
    
    // Test a few name lookups
    const testNames = ['Aaron Judge', 'Shohei Ohtani', 'Kyle Schwarber'];
    
    for (const name of testNames) {
      console.log(`\n🔍 Testing lookup for: ${name}`);
      const result = swingPathService.getPlayerSwingData(name, 'RHP');
      if (result) {
        console.log(`✅ Found: ${result.name} - Bat Speed: ${result.avgBatSpeed}`);
      } else {
        console.log(`❌ Not found: ${name}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

export default testSwingPathService;