
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkValuation() {
  let allProducts: any[] = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  let finished = false;

  while (!finished) {
    const { data, error } = await supabase
      .from('products')
      .select('name, stock, cost_price, product_type, base_product_id, conversion_factor, composition, company_id, status')
      .range(from, from + PAGE_SIZE - 1);


    if (error) {
      console.error('Error fetching products:', error);
      return;
    }

    if (data && data.length > 0) {
      allProducts = [...allProducts, ...data];
      if (data.length < PAGE_SIZE) {
        finished = true;
      } else {
        from += PAGE_SIZE;
      }
    } else {
      finished = true;
    }
  }

  const products = allProducts;
  const companies = [...new Set(products.map(p => p.company_id))];
  console.log('Companies found:', companies);

  for (const companyId of companies) {
    console.log(`\n--- Company: ${companyId} ---`);
    const companyProducts = products.filter(p => p.company_id === companyId);
    
    const baseProducts = companyProducts.map((p: any) => ({
      ...p,
      costPrice: Number(p.cost_price),
      stock: Number(p.stock)
    }));

    const finalProducts = baseProducts.map((p: any) => {
      // Case 1: KIT (Composition)
      if (p.composition && Array.isArray(p.composition) && p.composition.length > 0) {
        let possibleStock = Infinity;
        p.composition.forEach((item: any) => {
          const component = baseProducts.find((bp: any) => bp.id === item.productId);
          if (component) {
            const stock = Number(component.stock) || 0;
            const available = Math.floor(stock / item.quantity);
            if (available < possibleStock) {
              possibleStock = available;
            }
          } else {
            possibleStock = 0;
          }
        });
        return { ...p, stock: possibleStock === Infinity ? 0 : possibleStock };
      }
      
      // Case 2: SALE product with BASE product and conversion factor
      if (p.product_type === 'SALE' && p.base_product_id && p.conversion_factor) {
        const baseProduct = baseProducts.find((bp: any) => bp.id === p.base_product_id);
        if (baseProduct) {
          const virtualStock = Math.floor((Number(baseProduct.stock) || 0) / p.conversion_factor);
          return { ...p, stock: virtualStock };
        }
      }
      
      return p;
    });

    let totalValue = 0;
    let activeValue = 0;
    let inactiveValue = 0;
    let rawTotalValue = 0;

    finalProducts.forEach(p => {
      // Somente somamos valores de estoque positivo para a valorização
      const value = Math.max(0, p.stock) * p.costPrice;
      totalValue += value;
      
      if (p.composition && Array.isArray(p.composition) && p.composition.length > 0) {
        // console.log(`Kit: ${p.name}, Virtual Stock: ${p.stock}, Cost: ${p.costPrice}, Value: ${value}`);
      } else if (p.product_type === 'SALE' && p.base_product_id && p.conversion_factor) {
        // console.log(`Sale: ${p.name}, Virtual Stock: ${p.stock}, Cost: ${p.costPrice}, Value: ${value}`);
      }


      if (p.status === 'Ativo') {
        activeValue += value;
      } else {
        inactiveValue += value;
      }
    });

    baseProducts.forEach((p: any) => {
      rawTotalValue += Math.max(0, p.stock) * p.costPrice;
    });


    console.log('Total Stock Value (All):', totalValue);
    console.log('Formatted:', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue));
    console.log('Total Stock Value (Raw Stock):', rawTotalValue);
    console.log('Formatted:', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rawTotalValue));

    console.log('Total Stock Value (Active Only):', activeValue);
    console.log('Formatted:', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeValue));
    console.log('Total Stock Value (Inactive Only):', inactiveValue);
    console.log('Formatted:', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inactiveValue));


    console.log('Product Count:', companyProducts.length);

  }
}

checkValuation();
