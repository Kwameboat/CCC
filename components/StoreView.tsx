
import React, { useState } from 'react';
import { 
  ShoppingBag, Package, DollarSign, 
  Tag, Star, ChevronRight, Plus, 
  ArrowRight, TrendingUp, Search, X
} from 'lucide-react';

const StoreView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState([
    { name: 'ESV Bible (Hardcover)', sku: 'BIB-001', price: 'GH₵ 24.99', stock: 124, status: 'Active' },
    { name: 'Ministry Hoodie (Grey)', sku: 'APP-012', price: 'GH₵ 45.00', stock: 42, status: 'Active' },
    { name: 'Youth Journal (5pk)', sku: 'STA-005', price: 'GH₵ 12.00', stock: 0, status: 'Out of Stock' },
    { name: 'Worship CD - Grace', sku: 'MED-002', price: 'GH₵ 15.00', stock: 15, status: 'Active' },
    { name: 'Grace T-Shirt', sku: 'APP-015', price: 'GH₵ 20.00', stock: 88, status: 'Active' },
  ]);

  const [formData, setFormData] = useState({ name: '', sku: '', price: '', stock: '' });

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newProd = {
      name: formData.name,
      sku: formData.sku,
      price: `GH₵ ${parseFloat(formData.price).toFixed(2)}`,
      stock: parseInt(formData.stock),
      status: parseInt(formData.stock) > 0 ? 'Active' : 'Out of Stock'
    };
    setProducts([newProd, ...products]);
    setIsModalOpen(false);
    setFormData({ name: '', sku: '', price: '', stock: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Church Store & Resources</h2>
          <p className="text-slate-500">Manage products, books, and ministry apparel.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">
            View Analytics
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-md"
          >
            <Plus size={18} /> New Product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Live Products', value: products.length, color: 'indigo' },
          { label: 'Weekly Orders', value: '185', color: 'emerald' },
          { label: 'Out of Stock', value: products.filter(p => p.stock === 0).length, color: 'rose' },
          { label: 'Net Revenue (Mtd)', value: 'GH₵ 5,840', color: 'amber' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-indigo-100">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{stat.label}</div>
            <div className={`text-2xl font-black text-${stat.color}-600`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800">Inventory Catalog</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Search product..." className="pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none" />
            </div>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                   <th className="px-6 py-4">Product</th>
                   <th className="px-6 py-4">SKU</th>
                   <th className="px-6 py-4">Price</th>
                   <th className="px-6 py-4">Stock</th>
                   <th className="px-6 py-4">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {products.map((p, i) => (
                   <tr key={i} className="hover:bg-slate-50/50 animate-fadeIn">
                     <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-400">
                           <Package size={20} />
                         </div>
                         <div className="text-sm font-bold text-slate-900">{p.name}</div>
                       </div>
                     </td>
                     <td className="px-6 py-4 text-xs font-mono text-slate-500">{p.sku}</td>
                     <td className="px-6 py-4 text-sm font-black text-slate-900">{p.price}</td>
                     <td className="px-6 py-4">
                       <div className="flex flex-col gap-1">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">{p.stock} units</div>
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${p.stock > 10 ? 'bg-indigo-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(p.stock, 100)}%` }}></div>
                          </div>
                       </div>
                     </td>
                     <td className="px-6 py-4">
                       <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${p.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                         {p.status}
                       </span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
              Recent Orders
              <button className="text-xs text-indigo-600 font-bold hover:underline">View All</button>
            </h3>
            <div className="space-y-3">
               {[
                 { id: '#8420', user: 'Mark T.', amt: 'GH₵ 69.99', status: 'Processing' },
                 { id: '#8419', user: 'Anna K.', amt: 'GH₵ 12.00', status: 'Shipped' },
                 { id: '#8418', user: 'John L.', amt: 'GH₵ 124.50', status: 'Delivered' },
               ].map((order, i) => (
                 <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer">
                   <div>
                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{order.id}</div>
                     <div className="text-sm font-bold text-slate-900">{order.user}</div>
                   </div>
                   <div className="text-right">
                     <div className="text-sm font-black text-indigo-600">{order.amt}</div>
                     <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{order.status}</div>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Add New Inventory Item</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Product Name</label>
                <input 
                  required type="text" 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Ministry T-Shirt"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">SKU Code</label>
                  <input 
                    required type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    value={formData.sku}
                    onChange={e => setFormData({...formData, sku: e.target.value})}
                    placeholder="APP-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Price (GH₵)</label>
                  <input 
                    required type="number" step="0.01"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Initial Stock Level</label>
                <input 
                  required type="number"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={formData.stock}
                  onChange={e => setFormData({...formData, stock: e.target.value})}
                />
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700 transition-all">
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
