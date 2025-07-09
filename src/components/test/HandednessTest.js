import React, { useState, useEffect } from 'react';
import { getPlayerHandedness } from '../../services/handednessService';
import './HandednessTest.css';

const HandednessTest = () => {
    const [testResults, setTestResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const testCases = [
        { name: "A. García", team: "TEX", expected: "García, Adolis" },
        { name: "Adolis García", team: "TEX", expected: "García, Adolis" },
        { name: "García, Adolis", team: "TEX", expected: "García, Adolis" },
        { name: "M. Olson", team: "ATL", expected: "Olson, Matt" },
        { name: "Matt Olson", team: "ATL", expected: "Olson, Matt" }
    ];

    const runTests = async () => {
        setLoading(true);
        setTestResults([]);
        
        console.log("=== Running Handedness Test in React ===");
        
        const results = [];
        
        for (const testCase of testCases) {
            console.log(`\nTesting: "${testCase.name}" (Team: ${testCase.team})`);
            
            const startTime = Date.now();
            const handednessData = await getPlayerHandedness(testCase.name, testCase.team);
            const endTime = Date.now();
            
            const result = {
                input: testCase.name,
                team: testCase.team,
                expected: testCase.expected,
                found: !!handednessData,
                data: handednessData,
                time: endTime - startTime,
                matchedName: handednessData?.matchedName || 'N/A'
            };
            
            results.push(result);
            
            if (handednessData) {
                console.log(`✓ Found data for ${testCase.name}:`, handednessData);
            } else {
                console.log(`✗ No data found for ${testCase.name}`);
            }
        }
        
        setTestResults(results);
        setLoading(false);
    };

    useEffect(() => {
        // Auto-run tests when component mounts
        runTests();
    }, []);

    return (
        <div className="handedness-test">
            <h2>Handedness Lookup Test</h2>
            <p>Testing enhanced handedness lookup with roster fallback</p>
            
            <button onClick={runTests} disabled={loading}>
                {loading ? 'Running Tests...' : 'Run Tests Again'}
            </button>

            {testResults.length > 0 && (
                <div className="test-results">
                    <h3>Test Results</h3>
                    {testResults.map((result, index) => (
                        <div key={index} className={`test-result ${result.found ? 'success' : 'failed'}`}>
                            <div className="test-header">
                                <h4>Test {index + 1}: "{result.input}" ({result.team})</h4>
                                <span className={`status ${result.found ? 'found' : 'not-found'}`}>
                                    {result.found ? '✓ Found' : '✗ Not Found'}
                                </span>
                            </div>
                            
                            <div className="test-details">
                                <p><strong>Expected:</strong> {result.expected}</p>
                                <p><strong>Matched Name:</strong> {result.matchedName}</p>
                                <p><strong>Lookup Time:</strong> {result.time}ms</p>
                                
                                {result.data && (
                                    <div className="handedness-data">
                                        <h5>Handedness Data:</h5>
                                        <ul>
                                            <li><strong>Bats:</strong> {result.data.bats}</li>
                                            <li><strong>Throws:</strong> {result.data.throws}</li>
                                            {result.data.swingPath && (
                                                <li><strong>Swing Path:</strong> {JSON.stringify(result.data.swingPath)}</li>
                                            )}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="instructions">
                <h3>Manual Testing Instructions</h3>
                <ol>
                    <li>Open browser console (F12)</li>
                    <li>Navigate to Pinheads Playhouse</li>
                    <li>Find a game with Adolis García</li>
                    <li>Look for console logs showing handedness lookup process</li>
                    <li>Verify the BarrelMatchupCard shows swing path data</li>
                    <li>Check that both "A. García" and "Adolis García" work</li>
                </ol>
            </div>
        </div>
    );
};

export default HandednessTest;