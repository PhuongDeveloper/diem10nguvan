async function test() {
  const apiKey = 'AIzaSyCn0z__AW1XcGLd7cVCYadESNPsyw5iRF4';
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  const response = await fetch(url);
  const json = await response.json();
  console.log('Available Models:', json.models ? json.models.map(m => m.name).join(', ') : json);
}

test();
