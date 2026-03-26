const start = Date.now();
function t(msg) { console.log(`${Date.now() - start}ms: ${msg}`); }

async function run() {
  t('start fetch');
  const r = await fetch('http://localhost:3000/api/delivery/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({storeId:"f99a3ac4-7570-45b2-88b8-e65e1d0c375a",address:{address_line:"43 lorong kurau 19",city:"Perai",state:"Penang",postcode:"13700", lat: 5.4209, lng: 100.3441}})
  });
  t('got response');
}
run();
