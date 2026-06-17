const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars! URL:', supabaseUrl, 'Key:', supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: sales, error } = await supabase.from('sales').select('*');
  if (error) {
    console.error(error);
    return;
  }

  // Filter for June 2026 sales month (active)
  const salesMonth = sales.filter(s => {
    if (!s.date) return false;
    const dateStr = s.date.substring(0, 10);
    const [year, month] = dateStr.split('-').map(Number);
    return month === 6 && year === 2026 && s.status?.toLowerCase() !== 'cancelada';
  });

  console.log(`Found ${salesMonth.length} sales in June 2026`);

  // 1. Current DRE.tsx formula (with potential string concatenation):
  let currentDRE_receitaBruta = 0;
  salesMonth.forEach(s => {
    // mimicking JS evaluation in DRE.tsx: s.subtotal || (s.total + (s.discount || 0))
    const term = s.subtotal || (s.total + (s.discount || 0));
    currentDRE_receitaBruta += term;
  });

  console.log(`Current DRE formula output: ${currentDRE_receitaBruta} (Type: ${typeof currentDRE_receitaBruta})`);

  // Let's audit types in the database rows for June 2026
  let stringSubtotals = 0;
  let numericSubtotals = 0;
  let undefinedSubtotals = 0;
  salesMonth.forEach(s => {
    if (s.subtotal === undefined) undefinedSubtotals++;
    else if (typeof s.subtotal === 'string') stringSubtotals++;
    else if (typeof s.subtotal === 'number') numericSubtotals++;
  });
  console.log(`Types of s.subtotal in database rows:`, { undefinedSubtotals, stringSubtotals, numericSubtotals });

  // 2. Exact typing correct formula:
  let correct_receitaBruta = 0;
  salesMonth.forEach(s => {
    const subtotal = Number(s.subtotal) || (Number(s.total) + Number(s.discount || 0));
    correct_receitaBruta += subtotal;
  });
  console.log(`Correctly typed formula output: ${correct_receitaBruta} (Type: ${typeof correct_receitaBruta})`);

}

check();
