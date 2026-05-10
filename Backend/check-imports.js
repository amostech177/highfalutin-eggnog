// Quick import check for all backend modules (ESM)
const models = [
  './models/User.js',
  './models/Funnel.js',
  './models/Lead.js',
  './models/EmailTemplate.js',
  './models/Campaign.js',
  './models/CampaignRecipient.js',
  './models/Unsubscribe.js',
  './models/WalletTransaction.js',
  './models/PendingTopup.js'
];

const routes = [
  './routes/auth.routes.js',
  './routes/funnel.routes.js',
  './routes/publish.routes.js',
  './routes/lead.routes.js',
  './routes/billing.routes.js',
  './routes/campaign.routes.js',
  './routes/template.routes.js'
];

const utils = [
  './utils/billing.js',
  './utils/email-campaign.js'
];

const controllers = [
  './controllers/auth.controller.js',
  './controllers/funnel.controller.js',
  './controllers/lead.controller.js'
];

async function checkAll() {
  console.log('Checking imports...');
  
  for (const m of models) {
    try { await import(m); } catch(e) { console.error(`✗ Model ${m} failed:`, e.message); process.exit(1); }
  }
  console.log('✓ All models import OK');

  for (const r of routes) {
    try { await import(r); } catch(e) { console.error(`✗ Route ${r} failed:`, e.message); process.exit(1); }
  }
  console.log('✓ All routes import OK');

  for (const u of utils) {
    try { await import(u); } catch(e) { console.error(`✗ Utils ${u} failed:`, e.message); process.exit(1); }
  }
  console.log('✓ All utils import OK');

  for (const c of controllers) {
    try { await import(c); } catch(e) { console.error(`✗ Controller ${c} failed:`, e.message); process.exit(1); }
  }
  console.log('✓ All controllers import OK');

  console.log('\nAll modules import without errors.');
  process.exit(0);
}

checkAll();
