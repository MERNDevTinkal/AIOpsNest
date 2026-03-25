import React, { useEffect, useState } from 'react';

const Products: React.FC = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('/catalog/products')
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Our Products</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((product: any) => (
          <div key={product._id} className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-bold">{product.name}</h2>
            <p className="text-gray-600">{product.description}</p>
            <p className="text-blue-600 font-bold mt-2">${product.price}</p>
            <button className="bg-blue-600 text-white px-4 py-2 mt-4 rounded w-full">Add to Cart</button>
          </div>
        ))}
      </div>
      {products.length === 0 && <p>No products found.</p>}
    </div>
  );
};

export default Products;
