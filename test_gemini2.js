async function test() {
  const apiKey = 'AIzaSyCn0z__AW1XcGLd7cVCYadESNPsyw5iRF4';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Hello' }] }]
    })
  });
  
  const body = await response.text();
  console.log('STATUS:', response.status);
  console.log('BODY:', body);
}

test();
