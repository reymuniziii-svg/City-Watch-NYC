import fetch from 'node-fetch';

async function test() {
  const query = 'Empire State Building';
  const res1 = await fetch(`https://geosearch.planninglabs.nyc/v2/autocomplete?text=${encodeURIComponent(query)}`);
  const data1 = await res1.json();
  console.log('Address Search:', data1.features?.[0]?.properties?.label);
  
  if (data1.features?.[0]) {
    const [lng, lat] = data1.features[0].geometry.coordinates;
    console.log('Coords:', lat, lng);
    
    const url = `https://data.cityofnewyork.us/resource/872g-cjhh.json?$where=intersects(the_geom, 'POINT(${lng} ${lat})')`;
    console.log('URL:', url);
    const res2 = await fetch(url);
    const data2 = await res2.json();
    console.log('District Data:', data2);
  }
}

test();
