async function test() {
  const r = await fetch('http://localhost:3000/api/bookings/generate-ticket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId: "b3", customerName: "Test3", tourName: "Test Tour3" })
  });
  const data = await r.json();
  console.log('Generate:', data);
  const r2 = await fetch('http://localhost:3000' + data.ticketUrl);
  console.log('Download status:', r2.status);
  console.log('Content-Type:', r2.headers.get('content-type'));
}
test();
