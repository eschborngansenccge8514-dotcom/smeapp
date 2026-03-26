const start = Date.now();
function t(msg) { console.log(`${Date.now() - start}ms: ${msg}`); }

async function run() {
  const store = { lat: 5.479647, lng: 100.380916, address: "343 lorong kurau", postcode: "13700", state: "Penang" };
  const addr = { lat: 5.4209, lng: 100.3441, address_line: "43 lorong kurau 19", postcode: "13700", city: "Perai", state: "Penang" };

  t('testing Lalamove...');
  const lalaStart = Date.now();
  try {
    const r = await fetch('http://localhost:3000/api/delivery/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: "f99a3ac4-7570-45b2-88b8-e65e1d0c375a", address: { ...addr, delivery_enabled_easyparcel: false } })
    });
    t(`Lalamove done in ${Date.now() - lalaStart}ms`);
  } catch (e) { t(`Lalamove error: ${e.message}`); }

  t('testing EasyParcel...');
  const epStart = Date.now();
  try {
    const r = await fetch('http://localhost:3000/api/delivery/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: "f99a3ac4-7570-45b2-88b8-e65e1d0c375a", address: { ...addr, delivery_enabled_lalamove: false } })
    });
    t(`EasyParcel done in ${Date.now() - epStart}ms`);
  } catch (e) { t(`EasyParcel error: ${e.message}`); }
}
run();
