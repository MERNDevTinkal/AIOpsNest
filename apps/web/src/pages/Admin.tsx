import React, { useState, useEffect } from 'react';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [cms, setCms] = useState({ footer: '', themeColor: '#000' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      if (activeTab === 'products') {
        const res = await fetch('/catalog/products', { headers });
        setProducts(await res.json());
      } else if (activeTab === 'faqs') {
        const res = await fetch('/catalog/faqs', { headers });
        setFaqs(await res.json());
      } else if (activeTab === 'subscriptions') {
        const res = await fetch('/catalog/subscriptions', { headers });
        setSubscriptions(await res.json());
      } else if (activeTab === 'cms') {
        const res = await fetch('/catalog/config/global', { headers });
        const data = await res.json();
        setCms(data || { footer: '', themeColor: '#000' });
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveCMS = async () => {
    const token = localStorage.getItem('token');
    await fetch('/catalog/config/global', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cms)
    });
    alert('CMS Settings Saved');
  };

  return (
    <div className="admin-container p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="flex gap-4 mb-8">
        {['products', 'faqs', 'subscriptions', 'cms'].map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 rounded capitalize ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white'}`}
            onClick={() => setActiveTab(tab)}
          >{tab}</button>
        ))}
      </div>

      <div className="bg-white p-6 rounded shadow">
        {loading && <p>Loading...</p>}

        {activeTab === 'products' && (
          <div>
            <h2 className="text-xl mb-4">Manage Products</h2>
            <button className="bg-green-500 text-white px-4 py-2 mb-4 rounded">Add Product</button>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 border text-left">Name</th>
                  <th className="p-2 border text-left">Price</th>
                  <th className="p-2 border text-left">Stock</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => (
                  <tr key={p._id}>
                    <td className="p-2 border">{p.name}</td>
                    <td className="p-2 border">${p.price}</td>
                    <td className="p-2 border">{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'faqs' && (
          <div>
            <h2 className="text-xl mb-4">Manage FAQs</h2>
            {faqs.map((f: any) => (
              <div key={f._id} className="mb-2 p-2 border rounded">
                <strong>Q: {f.question}</strong>
                <p>A: {f.answer}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div>
            <h2 className="text-xl mb-4">Subscriptions</h2>
            <ul>
              {subscriptions.map((s: any) => (
                <li key={s._id} className="p-2 border-b">{s.email} - {s.isActive ? 'Active' : 'Inactive'}</li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'cms' && (
          <div>
            <h2 className="text-xl mb-4">CMS Settings</h2>
            <div className="mb-4">
              <label className="block mb-2">Footer Text</label>
              <input
                type="text"
                className="w-full border p-2 rounded"
                value={cms.footer}
                onChange={(e) => setCms({...cms, footer: e.target.value})}
              />
            </div>
            <div className="mb-4">
              <label className="block mb-2">Theme Primary Color</label>
              <input
                type="color"
                className="w-16 h-10"
                value={cms.themeColor}
                onChange={(e) => setCms({...cms, themeColor: e.target.value})}
              />
            </div>
            <button
              onClick={saveCMS}
              className="bg-blue-600 text-white px-6 py-2 rounded"
            >Save Settings</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
