'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

type Category = { id: string; name: string };
type Product = { id: string; name: string; slug: string; price: number; stock: number; status: string; image_url: string | null; sku: string | null; category_id: string | null };

const emptyForm = { name: '', price: '', compare_at_price: '', stock: '0', sku: '', category_id: '', description: '' };
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function Admin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categorySaving, setCategorySaving] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState('');
  const router = useRouter();

  async function loadCatalogue() {
    if (!supabase) return;
    const [{ data: productData, error: productError }, { data: categoryData }] = await Promise.all([
      supabase.from('products').select('id,name,slug,price,stock,status,image_url,sku,category_id').order('created_at', { ascending: false }),
      supabase.from('categories').select('id,name').order('sort_order'),
    ]);
    if (productError) setNotice(productError.message);
    else setProducts(productData || []);
    setCategories(categoryData || []);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    async function initialize() {
      if (!supabase) { setLoading(false); return; }
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace('/admin/login'); return; }
      const { data: adminUser } = await supabase.from('admin_users').select('user_id').eq('user_id', data.session.user.id).maybeSingle();
      if (!adminUser) {
        await supabase.auth.signOut();
        if (active) setNotice('This account is not authorized as a store administrator.');
        router.replace('/admin/login');
        return;
      }
      if (active) await loadCatalogue();
    }
    initialize();
    return () => { active = false; };
  }, [router]);

  async function addCategory(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !categoryName.trim()) return;
    setCategorySaving(true); setNotice('');
    const name = categoryName.trim();
    const slug = slugify(name);
    const { data, error } = await supabase.from('categories').insert({
      name,
      slug,
      description: categoryDescription.trim() || null,
    }).select('id,name').single();
    setCategorySaving(false);
    if (error) { setNotice('Category could not be created: ' + error.message); return; }
    setCategories(current => [...current, data]);
    setForm(current => ({ ...current, category_id: data.id }));
    setCategoryName(''); setCategoryDescription('');
    setNotice('Category created and selected for your next product.');
  }

  async function addProduct(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    if (!files.length) { setNotice('Please add at least one product photograph.'); return; }
    setSaving(true); setNotice('');
    const baseName = slugify(form.name);
    const uploadedUrls: string[] = [];
    for (const [index, file] of files.entries()) {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = Date.now() + '-' + baseName + '-' + index + '.' + extension;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file, { upsert: false });
      if (uploadError) {
        setSaving(false); setNotice('Photo upload failed: ' + uploadError.message); return;
      }
      uploadedUrls.push(supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl);
    }
    const payload = {
      name: form.name.trim(),
      slug: baseName + '-' + Date.now().toString().slice(-6),
      price: Number(form.price),
      compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
      stock: Number(form.stock),
      sku: form.sku.trim() || null,
      category_id: form.category_id || null,
      description: form.description.trim() || null,
      image_url: uploadedUrls[0],
      gallery_urls: uploadedUrls,
      status: 'draft',
    };
    const { error } = await supabase.from('products').insert(payload);
    setSaving(false);
    if (error) { setNotice('Product could not be saved: ' + error.message); return; }
    setNotice('Product saved as a draft. Review it and publish when ready.');
    setForm(emptyForm); setFiles([]);
    const input = document.getElementById('product-photos') as HTMLInputElement | null;
    if (input) input.value = '';
    await loadCatalogue();
  }

  async function importSpreadsheet(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !importFile) return;
    setImporting(true); setImportReport(''); setNotice('');
    try {
      const workbook = XLSX.read(await importFile.arrayBuffer(), { type: 'array' });
      const productsSheet = workbook.Sheets['Products'] || workbook.Sheets[workbook.SheetNames[0]];
      if (!productsSheet) throw new Error('The spreadsheet has no Products worksheet.');
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(productsSheet, { defval: '' });
      if (!rows.length) throw new Error('No product rows were found in the Products sheet.');
      if (rows.length > 500) throw new Error('Import is limited to 500 products per spreadsheet.');
      const normalize = (value: unknown) => String(value ?? '').trim();
      const header = (row: Record<string, unknown>, key: string) => {
        const found = Object.keys(row).find(k => k.trim().toLowerCase() === key);
        return found ? row[found] : '';
      };
      const categoryMap = new Map(categories.map(category => [category.name.trim().toLowerCase(), category.id]));
      const prepared = rows.map((row, index) => {
        const name = normalize(header(row, 'name'));
        const priceText = normalize(header(row, 'price'));
        const price = Number(priceText.replace(/[^0-9.-]/g, ''));
        const stockText = normalize(header(row, 'stock'));
        const stock = stockText ? Number(stockText) : 0;
        if (!name) throw new Error('Products row ' + (index + 2) + ': product name is required.');
        if (!priceText || !Number.isFinite(price) || price < 0) throw new Error('Products row ' + (index + 2) + ': enter a valid price.');
        if (!Number.isInteger(stock) || stock < 0) throw new Error('Products row ' + (index + 2) + ': stock must be a whole number of 0 or more.');
        const compareText = normalize(header(row, 'compare_at_price'));
        const compare = compareText ? Number(compareText.replace(/[^0-9.-]/g, '')) : null;
        if (compare !== null && (!Number.isFinite(compare) || compare < price)) throw new Error('Products row ' + (index + 2) + ': compare_at_price must be greater than or equal to price.');
        const sku = normalize(header(row, 'sku')) || null;
        const imageUrl = normalize(header(row, 'image_url')) || null;
        if (imageUrl && !/^https?:\/\//i.test(imageUrl)) throw new Error('Products row ' + (index + 2) + ': image_url must be a public HTTP(S) URL.');
        const galleryText = normalize(header(row, 'gallery_urls'));
        const gallery = galleryText ? galleryText.split('|').map(value => value.trim()).filter(Boolean) : [];
        if (gallery.some(url => !/^https?:\/\//i.test(url))) throw new Error('Products row ' + (index + 2) + ': every gallery_urls entry must be a public HTTP(S) URL.');
        const categoryName = normalize(header(row, 'category'));
        return { name, price, compare_at_price: compare, stock, sku, image_url: imageUrl, gallery_urls: imageUrl ? [imageUrl, ...gallery] : gallery, categoryName, description: normalize(header(row, 'description')) || null };
      });
      const skuSet = new Set<string>();
      for (const row of prepared) {
        if (row.sku && skuSet.has(row.sku)) throw new Error('Product SKUs must be unique. Duplicate: ' + row.sku);
        if (row.sku) skuSet.add(row.sku);
      }
      const variantSheet = workbook.Sheets['Product Variants'];
      const variantRows = variantSheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(variantSheet, { defval: '' }) : [];
      if (variantRows.length > 2000) throw new Error('Import is limited to 2,000 product variants per spreadsheet.');
      const newCategoryNames = Array.from(new Set(prepared.map(row => row.categoryName).filter(name => name && !categoryMap.has(name.toLowerCase()))));
      for (const name of newCategoryNames) {
        const { data, error } = await supabase.from('categories').insert({ name, slug: slugify(name) }).select('id,name').single();
        if (error) throw new Error('Could not create category "' + name + '": ' + error.message);
        categoryMap.set(data.name.toLowerCase(), data.id);
      }
      const productPayload = prepared.map((row, index) => ({
        name: row.name, slug: slugify(row.name) + '-' + Date.now().toString(36) + '-' + index,
        price: row.price, compare_at_price: row.compare_at_price, stock: row.stock, sku: row.sku,
        category_id: row.categoryName ? categoryMap.get(row.categoryName.toLowerCase()) || null : null,
        description: row.description, image_url: row.image_url, gallery_urls: row.gallery_urls, status: 'draft',
      }));
      const { data: insertedProducts, error: productError } = await supabase.from('products').insert(productPayload).select('id,sku,name');
      if (productError) throw new Error('Products could not be imported: ' + productError.message);
      let insertedVariantCount = 0;
      if (variantRows.length) {
        const productBySku = new Map((insertedProducts || []).filter(item => item.sku).map(item => [String(item.sku), item]));
        const variantPayload = variantRows.map((row, index) => {
          const productSku = normalize(header(row, 'product_sku'));
          const parent = productBySku.get(productSku);
          if (!productSku || !parent) throw new Error('Product Variants row ' + (index + 2) + ': product_sku "' + productSku + '" must match a SKU in the Products sheet.');
          const color = normalize(header(row, 'colour')) || normalize(header(row, 'color'));
          if (!color) throw new Error('Product Variants row ' + (index + 2) + ': colour is required.');
          const priceText = normalize(header(row, 'price'));
          const price = priceText ? Number(priceText.replace(/[^0-9.-]/g, '')) : null;
          if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error('Product Variants row ' + (index + 2) + ': price must be a valid non-negative number.');
          const compareText = normalize(header(row, 'compare_at_price'));
          const compare = compareText ? Number(compareText.replace(/[^0-9.-]/g, '')) : null;
          if (compare !== null && (!Number.isFinite(compare) || compare < (price ?? Number(prepared.find(item => item.sku === productSku)?.price ?? 0)))) throw new Error('Product Variants row ' + (index + 2) + ': compare_at_price must be greater than or equal to the variant price.');
          const stockText = normalize(header(row, 'stock'));
          const stock = stockText ? Number(stockText) : 0;
          if (!Number.isInteger(stock) || stock < 0) throw new Error('Product Variants row ' + (index + 2) + ': stock must be a whole number of 0 or more.');
          const image = normalize(header(row, 'image_url')) || null;
          const galleryText = normalize(header(row, 'gallery_urls'));
          const gallery = galleryText ? galleryText.split('|').map(value => value.trim()).filter(Boolean) : [];
          if ([image, ...gallery].filter(Boolean).some(url => !/^https?:\/\//i.test(url))) throw new Error('Product Variants row ' + (index + 2) + ': image URLs must be public HTTP(S) URLs.');
          return { product_id: parent.id, colour: color, sku: normalize(header(row, 'variant_sku')) || null, price, compare_at_price: compare, stock, image_url: image, gallery_urls: image ? [image, ...gallery] : gallery, sort_order: index };
        });
        const { error: variantError } = await supabase.from('product_variants').insert(variantPayload);
        if (variantError) throw new Error('Products were imported, but variants could not be saved: ' + variantError.message);
        insertedVariantCount = variantPayload.length;
      }
      setImportReport('Successfully imported ' + productPayload.length + ' products as drafts, including ' + insertedVariantCount + ' colour variants. Created ' + newCategoryNames.length + ' new categories.');
      setImportFile(null);
      const input = document.getElementById('catalogue-import') as HTMLInputElement | null;
      if (input) input.value = '';
      await loadCatalogue();
    } catch (error) {
      setImportReport(error instanceof Error ? error.message : 'Spreadsheet import failed.');
    } finally {
      setImporting(false);
    }
  }

  async function togglePublish(product: Product) {
    if (!supabase) return;
    const nextStatus = product.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase.from('products').update({ status: nextStatus }).eq('id', product.id);
    if (error) setNotice(error.message);
    else { setNotice(product.name + ' is now ' + nextStatus + '.'); await loadCatalogue(); }
  }

  async function logout() { await supabase?.auth.signOut(); router.replace('/admin/login'); }

  return (
    <main className="inner-page admin-page">
      <p className="eyebrow">CRAFTYCORNERS · PRIVATE STORE STUDIO</p>
      <div className="section-heading"><div><h1>Product <em>studio.</em></h1><p>Manage the pieces that appear in your storefront.</p></div><button className="text-link" onClick={logout}>Sign out ↗</button></div>
      {!supabase && <section className="simple-panel"><h2>Supabase connection needed</h2><p>Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your deployment environment.</p></section>}
      <div className="admin-grid">
        <section className="simple-panel">
          <p className="eyebrow">COLLECTION MANAGEMENT</p><h2>Add a category</h2>
          <form className="admin-form" onSubmit={addCategory}>
            <label>Category name<input required maxLength={80} value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="e.g. Tableware" /></label>
            <label>Short description<textarea rows={2} value={categoryDescription} onChange={e => setCategoryDescription(e.target.value)} placeholder="What will customers find in this collection?" /></label>
            <button className="primary" disabled={categorySaving}>{categorySaving ? 'Creating category…' : 'Create category →'}</button>
          </form>
          <hr />
          <p className="eyebrow">BULK CATALOGUE IMPORT</p><h2>Import from spreadsheet</h2>
          <p>Upload an .xlsx, .xls or .csv file. Use the Products sheet for listings and Product Variants for colour options. Categories are created automatically.</p>
          <p><a className="text-link" href="/product-import-template.csv" download>Download import template ↓</a></p>
          <form className="admin-form" onSubmit={importSpreadsheet}>
            <label>Product spreadsheet<input id="catalogue-import" type="file" accept=".xlsx,.xls,.csv" required onChange={e => setImportFile(e.target.files?.[0] || null)} /><small>Up to 500 products and 2,000 colour variants. Variant rows link using the parent product SKU.</small></label>
            <button className="primary" disabled={importing || !importFile}>{importing ? 'Importing products…' : 'Import products as drafts →'}</button>
          </form>
          {importReport && <p className="admin-notice" role="status">{importReport}</p>}
          <hr />
          <p className="eyebrow">NEW LISTING</p><h2>Add a product</h2>
          <form className="admin-form" onSubmit={addProduct}>
            <label>Product name<input required maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <div className="form-pair">
              <label>Selling price (₹)<input required type="number" min="0" step=".01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></label>
              <label>Compare-at price (₹)<input type="number" min="0" step=".01" value={form.compare_at_price} onChange={e => setForm({ ...form, compare_at_price: e.target.value })} /></label>
            </div>
            <div className="form-pair">
              <label>SKU / product code<input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></label>
              <label>Available stock<input required type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></label>
            </div>
            <label>Collection<select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}><option value="">Choose a collection</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>Product photographs<input id="product-photos" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={e => setFiles(Array.from(e.target.files || []))} /><small>First photo is the cover image. Up to 10 MB per image.</small></label>
            <label>Product description<textarea rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the material, craftsmanship, dimensions and care instructions." /></label>
            <button className="primary" disabled={saving}>{saving ? 'Uploading and saving…' : 'Save draft & add another →'}</button>
            <small>After saving, the form clears so you can enter the next product. Repeat for each item; products are saved as drafts until you publish them.</small>
          </form>
        </section>
        <section className="simple-panel">
          <p className="eyebrow">LIVE CATALOGUE CONTROL</p><h2>Your products <span className="catalogue-count">({products.length})</span></h2>
          {loading ? <p>Loading catalogue…</p> : !products.length ? <p>No products have been added yet. Your first listing starts here.</p> : products.map(product => (
            <div className="admin-product" key={product.id}>
              <div><b>{product.name}</b><small>₹{Number(product.price).toLocaleString('en-IN')} · {product.stock} in stock · {product.sku || 'No SKU'} · {product.status}</small></div>
              <button className="text-link" onClick={() => togglePublish(product)}>{product.status === 'published' ? 'Unpublish' : 'Publish'}</button>
            </div>
          ))}
        </section>
      </div>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
    </main>
  );
}
