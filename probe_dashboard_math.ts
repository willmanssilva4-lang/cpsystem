import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- Checking all promo sales & dates ---');
  const { data: sales } = await supabase.from('sales').select('*');
  const { data: saleItems } = await supabase.from('sale_items').select('*');
  const { data: products } = await supabase.from('products').select('*');
  const { data: promotions } = await supabase.from('promotions').select('*');
  const { data: stockMovements } = await supabase.from('stock_movements').select('*');

  if (!sales) return;

  // Let's filter sales for "HOJE" as the dashboard of ERP defaults to. What is the current date filter in Dashboard?
  // Let's look at how Dashboard filters sales.
  // In Dashboard, the default date filter: 
  // Let's see the default date of Dashboard. Can we search for initial "startDate" in Dashboard.tsx or relatorios/page.tsx?
  // Let's do that in a second. But first, let's see which sales are counted under promotions across ALL sales.

  let sumAllPromo = 0;
  for (const s of sales) {
    const dbItems = saleItems?.filter((si: any) => si.sale_id === s.id) || [];
    let items;
    if (dbItems.length > 0) {
      items = dbItems.map((si: any) => ({
        productId: si.product_id,
        quantity: si.quantity,
        price: si.price,
        discount: si.discount,
        promotionId: si.promotion_id,
        originalPrice: si.original_price ?? si.price
      }));
    } else {
      const saleMovements = stockMovements?.filter((m: any) => 
        m.type === 'VENDA' && (m.origin === `Venda #${s.id}` || m.origin === s.id)
      ) || [];
      items = saleMovements.map((move: any) => {
        const prod = products?.find((p: any) => p.id === move.product_id);
        const price = prod ? (prod.salePrice ?? prod.sale_price ?? 0) : 0;
        return {
          productId: move.product_id,
          quantity: move.quantity || 0,
          price: price,
          originalPrice: price,
          discount: 0,
          promotionId: null
        };
      });
    }

    const hasSaleDiscount = s.discount && s.discount > 0;
    const promoItems = (items || []).filter((item: any) => {
      if (item.promotionId || (item.discount && item.discount > 0) || (item.originalPrice && item.price < item.originalPrice)) {
        return true;
      }
      if (hasSaleDiscount) {
        return true;
      }
      
      const isPromoProduct = (promotions || []).some((promo: any) => {
        if (promo.status !== 'ACTIVE') return false;
        const promoStart = new Date(promo.start_date || promo.startDate);
        const promoEnd = new Date(promo.end_date || promo.endDate);
        const saleDate = new Date(s.date);
        
        if (saleDate < promoStart || saleDate > promoEnd) return false;
        
        let targets: string[] = [];
        if (typeof promo.target_id === 'string') {
          try {
            targets = JSON.parse(promo.target_id);
          } catch (e) {
            targets = [promo.target_id];
          }
        } else if (Array.isArray(promo.target_id)) {
          targets = promo.target_id;
        }
        
        return targets.includes(item.productId);
      });
      
      return isPromoProduct;
    });

    const promoItemsTotal = promoItems.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
    let finalPromoVal = promoItemsTotal;
    if (hasSaleDiscount && promoItemsTotal === 0) {
      finalPromoVal = s.total;
    }

    if (finalPromoVal > 0) {
      console.log(`PROMO SALE -> ID: ${s.id}, Date: ${s.date}, Total: ${s.total}, Discount: ${s.discount}, calculated promo val: ${finalPromoVal}`);
      sumAllPromo += finalPromoVal;
    }
  }

  console.log('Total across all promotional sales:', sumAllPromo);
}

run();
