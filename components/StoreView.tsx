import React, { useEffect, useState } from 'react';
import { Package, Plus, Search, X, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../lib/toast';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

const StoreView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({ name: '', sku: '', price: '', stock: '' });

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showToast(error.message, 'error');
      setProducts([]);
    } else {
      setProducts(
        (data || []).map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: Number(p.price),
          stock: Number(p.stock_quantity ?? 0),
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const stock = parseInt(formData.stock, 10) || 0;
    const { error } = await supabase.from('products').insert([
      {
        name: formData.name.trim(),
        sku: formData.sku.trim().toUpperCase(),
        price: parseFloat(formData.price) || 0,
        stock_quantity: stock,
      },
    ]);
    setSaving(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Product registered.', 'success');
    setIsModalOpen(false);
    setFormData({ name: '', sku: '', price: '', stock: '' });
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this product from inventory?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Product removed.', 'success');
    fetchProducts();
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const outOfStock = products.filter((p) => p.stock === 0).length;
  const inventoryValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Church Store & Resources</h2>
          <p className="text-slate-500">Manage products, books, and ministry apparel.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchProducts}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-gold-600"
            aria-label="Refresh inventory"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-black rounded-lg text-sm font-bold hover:bg-gold-600 shadow-md"
          >
            <Plus size={18} /> New Product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Live Products', value: products.length },
          { label: 'Out of Stock', value: outOfStock },
          { label: 'Inventory Value', value: `GH₵ ${inventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{stat.label}</div>
            <div className="text-2xl font-black text-slate-900">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 gap-4">
          <h3 className="font-bold text-slate-800">Inventory Catalog</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 flex justify-center text-slate-400">
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length > 0 ? (
                  filtered.map((p) => {
                    const status = p.stock > 0 ? 'Active' : 'Out of Stock';
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gold-50 rounded-xl flex items-center justify-center text-gold-600">
                              <Package size={20} />
                            </div>
                            <div className="text-sm font-bold text-slate-900">{p.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">{p.sku}</td>
                        <td className="px-6 py-4 text-sm font-black text-slate-900">GH₵ {p.price.toFixed(2)}</td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{p.stock} units</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                              status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            aria-label={`Delete ${p.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                      No products in inventory yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Add New Inventory Item</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Product Name</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gold-500 outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">SKU Code</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Price (GH₵)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Initial Stock Level</label>
                <input
                  required
                  type="number"
                  min="0"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-gold-500 text-black rounded-xl text-sm font-bold hover:bg-gold-600 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : null}
                Register Product
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreView;
