'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

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
