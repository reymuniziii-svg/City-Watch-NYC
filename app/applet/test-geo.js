async function test() {
  try {
    const r = await fetch('https://geosearch.planninglabs.nyc/v2/autocomplete?text=120%20bway');
    const d = await r.json();
    console.log(d.features[0]);
  } catch (e) {
    console.error(e);
  }
}
test();
