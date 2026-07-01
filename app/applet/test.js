export default async function test() {
  const r = await fetch('http://localhost:3000/api/bookings/generate-ticket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId: "b1", customerName: "Test", tourName: "Test Tour" })
  });
  console.log(await r.text());
}
test();
