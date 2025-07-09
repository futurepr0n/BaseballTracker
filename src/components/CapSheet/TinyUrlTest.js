import React, { useState } from 'react';
import { createTinyUrl } from '../../services/tinyUrlService';

const TinyUrlTest = () => {
  const [longUrl, setLongUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testTinyUrl = async () => {
    setLoading(true);
    setError('');
    setShortUrl('');

    try {
      // Create a test URL similar to what CapSheet would generate
      const testUrl = longUrl || `${window.location.origin}/capsheet?share=1234567890abcdef1234567890abcdef&data=VGhpcyBpcyBhIHRlc3QgdXJsIHRoYXQgd291bGQgbm9ybWFsbHkgYmUgdmVyeSBsb25nIGFuZCBjb250YWluIGxvdHMgb2YgZGF0YQ==`;
      
      console.log('Testing TinyURL with:', testUrl);
      const result = await createTinyUrl(testUrl, {
        description: 'CapSheet Test URL'
      });
      
      setShortUrl(result.shortUrl);
      console.log('TinyURL Result:', result);
    } catch (err) {
      setError(err.message);
      console.error('TinyURL Test Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px', backgroundColor: '#f9f9f9' }}>
      <h3>TinyURL Integration Test</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label>
          Long URL to shorten (optional):
          <input
            type="text"
            value={longUrl}
            onChange={(e) => setLongUrl(e.target.value)}
            placeholder="Leave empty to use test URL"
            style={{ width: '100%', padding: '5px', marginTop: '5px' }}
          />
        </label>
      </div>

      <button 
        onClick={testTinyUrl} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? 'Creating TinyURL...' : 'Test TinyURL Creation'}
      </button>

      {shortUrl && (
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#d4edda', borderRadius: '5px' }}>
          <strong>Success!</strong> Short URL created:
          <br />
          <a href={shortUrl} target="_blank" rel="noopener noreferrer">
            {shortUrl}
          </a>
          <br />
          <small>Length reduced from ~{longUrl.length || 200} to {shortUrl.length} characters</small>
        </div>
      )}

      {error && (
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8d7da', borderRadius: '5px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
        <strong>Note:</strong> This test component demonstrates TinyURL integration.
        <br />
        The free API may have CORS restrictions. In production, use:
        <ul style={{ marginTop: '5px' }}>
          <li>TinyURL API with token (no CORS issues)</li>
          <li>Backend proxy endpoint</li>
          <li>Serverless function (Vercel, Netlify)</li>
        </ul>
      </div>
    </div>
  );
};

export default TinyUrlTest;