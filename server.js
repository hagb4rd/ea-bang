#!/usr/bin/env node
var express = require('express');
var fs = require('fs');
var path = require('path');

var app = express();
var PORT = process.env.PORT || 3000;

// Load engine map
var engineMap = new Map();

try {
  var rawData = fs.readFileSync(path.join(__dirname, 'engines.json'), 'utf8');
  var policy = JSON.parse(rawData);
  var engines = policy["SiteSearchSettings"];

  engines.forEach(engine => {
    if (engine.shortcut && engine.url) {
      engineMap.set(engine.shortcut.toLowerCase(), engine.url);
    }
  });
  console.log(`Loaded ${engineMap.size} search shortcuts.`);
} catch (err) {
  console.error('Failed to load engines.json:', err.message);
  process.exit(1);
}

// Serve static frontend from /public
app.use(express.static(path.join(__dirname, 'public')));

// Process query string & execute redirect
var handleSearch = (rawQuery, res) => {
  if (!rawQuery) {
    return res.redirect('/');
  }

  var decodedQuery = decodeURIComponent(rawQuery).trim();
  var spaceIndex = decodedQuery.indexOf(' ');

  var shortcut = decodedQuery;
  var searchTerms = '';

  if (spaceIndex !== -1) {
    shortcut = decodedQuery.slice(0, spaceIndex);
    searchTerms = decodedQuery.slice(spaceIndex + 1).trim();
  }

  var templateUrl = engineMap.get(shortcut.toLowerCase());

  if (!templateUrl) {
    return res.status(404).send(`
      <body style="background:#0f172a;color:#f8fafc;font-family:sans-serif;padding:2rem;">
        <h2>Shortcut "${shortcut}" not found.</h2>
        <a href="/" style="color:#38bdf8;">Return Home</a>
      </body>
    `);
  }

  var targetUrl = templateUrl.replace('{searchTerms}', encodeURIComponent(searchTerms));
  return res.redirect(targetUrl);
};

// Route for form submit or query string GET /search?q=w%20debian
app.get('/search', (req, res) => {
  handleSearch(req.query.q, res);
});

// Route for direct path navigation GET /w%20debian
app.get('/:query', (req, res) => {
  handleSearch(req.params.query, res);
});

app.listen(PORT, () => {
  console.log(`Search router running on http://localhost:${PORT}`);
});
