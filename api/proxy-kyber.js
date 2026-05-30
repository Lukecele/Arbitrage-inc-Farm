const fetch = require('node-fetch');

// Simple serverless proxy for Kyber/Pancake GraphQL endpoints
// Avoids CORS/preflight redirect issues by performing the request server-side.
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  try {
    const body = req.body && Object.keys(req.body).length ? req.body : await new Promise((r) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => r(JSON.parse(data || '{}')));
    });

    // Allow caller to specify which upstream to target, default to Kyber Elastic subgraph
    const upstream = (body.upstream && String(body.upstream)) || 'kyber';
    const upstreamMap = {
      kyber: 'https://api.thegraph.com/subgraphs/name/kybernetwork/kyberswap-elastic-bsc',
      pancake: 'https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc'
    };

    const target = upstreamMap[upstream] || upstreamMap['kyber'];

    const resp = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: body.query })
    });

    const json = await resp.json();
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = resp.status || 200;
    res.end(JSON.stringify(json));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: String(err) }));
  }
};
