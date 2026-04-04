import https from 'https';
https.get('https://geosearch.planninglabs.nyc/v2/autocomplete?text=120%20Broadway', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(JSON.stringify(JSON.parse(data).features[0].properties, null, 2)));
});
