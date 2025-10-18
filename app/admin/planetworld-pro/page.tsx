'use client';

import { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2, AlertCircle, Package } from 'lucide-react';

export default function PlanetWorldProAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [stockFile, setStockFile] = useState<File | null>(null);
  const [pricelistFile, setPricelistFile] = useState<File | null>(null);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'KinkyKong-123') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid password');
    }
  };

  const handleStockFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setStockFile(file);
  };

  const handlePricelistFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPricelistFile(file);
  };

  const handleImport = async () => {
    if (!stockFile || !pricelistFile) {
      setError('Please upload both Stock On Hand and Pricelist files');
      return;
    }

    setUploading(true);
    setResult(null);
    setError('');

    try {
      const formData = new FormData();
      formData.append('stockFile', stockFile);
      formData.append('pricelistFile', pricelistFile);

      const response = await fetch('/api/admin/planetworld-pro/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        setStockFile(null);
        setPricelistFile(null);
        // Reset file inputs
        const stockInput = document.getElementById('stock-file') as HTMLInputElement;
        const priceInput = document.getElementById('price-file') as HTMLInputElement;
        if (stockInput) stockInput.value = '';
        if (priceInput) priceInput.value = '';
      } else {
        setError(data.error || 'Import failed');
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-center">Planet World Pro Import</h1>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter admin password"
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">Planet World Pro - Weekly Import</h1>
          <p className="text-gray-600 mb-8">Upload weekly stock and pricing files to update the database</p>

          <div className="space-y-6">
            {/* Stock On Hand File */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition">
              <div className="flex items-center gap-4 mb-4">
                <FileSpreadsheet className="w-8 h-8 text-blue-500" />
                <div>
                  <h3 className="font-semibold text-lg">Stock On Hand (SOH)</h3>
                  <p className="text-sm text-gray-500">Excel file with current inventory levels</p>
                </div>
              </div>
              <input
                id="stock-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleStockFileChange}
                className="w-full"
              />
              {stockFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  {stockFile.name}
                </div>
              )}
            </div>

            {/* Pricelist File */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition">
              <div className="flex items-center gap-4 mb-4">
                <FileSpreadsheet className="w-8 h-8 text-green-500" />
                <div>
                  <h3 className="font-semibold text-lg">Pro Pricelist</h3>
                  <p className="text-sm text-gray-500">Excel file with pricing (20 brand sheets)</p>
                </div>
              </div>
              <input
                id="price-file"
                type="file"
                accept=".xlsx,.xls,.xlsm"
                onChange={handlePricelistFileChange}
                className="w-full"
              />
              {pricelistFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  {pricelistFile.name}
                </div>
              )}
            </div>

            {/* Import Button */}
            <button
              onClick={handleImport}
              disabled={!stockFile || !pricelistFile || uploading}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg font-semibold"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Import Products
                </>
              )}
            </button>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-800">Import Failed</h4>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            {/* Success Result */}
            {result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <h3 className="font-semibold text-lg text-green-800">Import Successful!</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-green-200">
                    <span className="text-gray-600">Products in stock file:</span>
                    <span className="font-semibold">{result.stockCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-green-200">
                    <span className="text-gray-600">Products in pricelist:</span>
                    <span className="font-semibold">{result.priceCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-green-200">
                    <span className="text-gray-600">Matched (stock + price):</span>
                    <span className="font-semibold text-blue-600">{result.merged || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-green-200">
                    <span className="text-gray-600">Products updated:</span>
                    <span className="font-semibold text-green-600">{result.updated || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600">New products added:</span>
                    <span className="font-semibold text-green-600">{result.added || 0}</span>
                  </div>
                </div>

                {result.needsEmbeddings && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-yellow-800">Embeddings Required</p>
                      <p className="text-yellow-700">
                        {result.needsEmbeddings} products need embeddings. They will be generated automatically in the background.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <h4 className="font-semibold mb-1">How it works:</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Upload both Stock On Hand and Pricelist Excel files</li>
                  <li>System automatically merges stock quantities with prices</li>
                  <li>Products are matched by SKU/Item Code</li>
                  <li>Pricing: Retail = file price (excl VAT), Cost = retail × 0.75</li>
                  <li>New products are added, existing products are updated</li>
                  <li>Embeddings are generated automatically for search</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
