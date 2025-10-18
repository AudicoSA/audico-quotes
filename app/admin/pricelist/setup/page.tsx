'use client';

import { useState } from 'react';
import { Upload, CheckCircle, Settings, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

interface TrainingSession {
  filename: string;
  supplierDetected: string;
  priceTypeDetected: 'cost' | 'retail' | 'selling';
  sampleProducts: any[];
  columnMappings: Record<string, string>;
  priceRules: Record<string, any>;
}

export default function PricelistSetupPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<TrainingSession | null>(null);
  const [trainedSuppliers, setTrainedSuppliers] = useState<string[]>([]);

  // Manual override fields
  const [manualSupplier, setManualSupplier] = useState('');
  const [manualPriceType, setManualPriceType] = useState<'cost' | 'retail' | 'selling'>('retail');
  const [discountPercent, setDiscountPercent] = useState('');
  const [vatRate, setVatRate] = useState('15');
  const [markup, setMarkup] = useState('25');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'KinkyKong-123') {
      setIsAuthenticated(true);
      setError('');
      loadExistingProfiles();
    } else {
      setError('Invalid password');
    }
  };

  const loadExistingProfiles = async () => {
    try {
      const res = await fetch('/api/admin/pricelist/config?action=list');
      const data = await res.json();
      if (data.success) {
        setTrainedSuppliers(data.profiles.map((p: any) => p.supplier_name));
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setCurrentSession(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('training_mode', 'true');

      const response = await fetch('/api/admin/pricelist/train', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Training failed');
      }

      // Set detected values in manual fields
      setManualSupplier(data.supplier_detected);
      setManualPriceType(data.price_type_detected);

      // Pre-fill based on detected price type
      if (data.price_type_detected === 'retail' && data.price_rules?.discount_from_retail) {
        setDiscountPercent(String(data.price_rules.discount_from_retail * 100));
      }

      setCurrentSession(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentSession) return;

    setLoading(true);
    try {
      // Build price rules based on manual inputs
      const priceRules: Record<string, any> = {
        includes_vat: true,
      };

      if (manualPriceType === 'retail' && discountPercent) {
        priceRules.discount_from_retail = parseFloat(discountPercent) / 100;
        priceRules.description = `Retail prices - your cost is ${discountPercent}% less`;
      } else if (manualPriceType === 'cost') {
        priceRules.apply_vat = true;
        priceRules.vat_rate = parseFloat(vatRate) / 100;
        priceRules.retail_markup = parseFloat(markup) / 100;
        priceRules.description = `Cost excl VAT - add ${vatRate}% VAT, then ${markup}% markup`;
      }

      const response = await fetch('/api/admin/pricelist/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          supplier_name: manualSupplier,
          price_type: manualPriceType,
          price_rules: priceRules,
          column_mappings: currentSession.columnMappings,
          expected_brand: currentSession.sampleProducts[0]?.brand || manualSupplier,
          file_pattern: `${manualSupplier.split(' ')[0]}*`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save profile');
      }

      alert(`✅ Profile saved for ${manualSupplier}!`);
      setTrainedSuppliers([...trainedSuppliers, manualSupplier]);
      setCurrentSession(null);
      setManualSupplier('');
      setDiscountPercent('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Pricelist Training</h1>
            <p className="text-gray-600 mt-2">Setup supplier profiles</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              autoFocus
            />

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all"
            >
              Access Setup
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Pricelist Training</h1>
              <p className="text-gray-600 mt-1">Upload sample files to train supplier profiles</p>
            </div>
            <Link
              href="/admin/pricelist"
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Upload
            </Link>
          </div>
        </div>

        {/* Trained Suppliers */}
        {trainedSuppliers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              ✅ Trained Suppliers ({trainedSuppliers.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {trainedSuppliers.map((supplier) => (
                <div
                  key={supplier}
                  className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {supplier}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Section */}
        {!currentSession && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-indigo-500 transition-colors">
              <input
                type="file"
                id="training-file"
                accept=".pdf,.xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={loading}
                className="hidden"
              />
              <label
                htmlFor="training-file"
                className={`cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-10 h-10 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {loading ? 'Analyzing...' : 'Upload Sample Pricelist'}
                </h3>
                <p className="text-gray-600">
                  One file per supplier for training
                </p>
              </label>
            </div>

            {error && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Training Results */}
        {currentSession && (
          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Review & Configure</h2>
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                Save Profile
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Left: Detected Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    value={manualSupplier}
                    onChange={(e) => setManualSupplier(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Type
                  </label>
                  <select
                    value={manualPriceType}
                    onChange={(e) => setManualPriceType(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="retail">Retail</option>
                    <option value="cost">Cost</option>
                    <option value="selling">Selling</option>
                  </select>
                </div>

                {manualPriceType === 'retail' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount from Retail (%)
                    </label>
                    <input
                      type="number"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      placeholder="e.g., 25 for 25% discount"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    {discountPercent && (
                      <p className="text-sm text-gray-600 mt-2">
                        Example: R10,000 retail → R{(10000 * (1 - parseFloat(discountPercent) / 100)).toFixed(0)} your cost
                      </p>
                    )}
                  </div>
                )}

                {manualPriceType === 'cost' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        VAT Rate (%)
                      </label>
                      <input
                        type="number"
                        value={vatRate}
                        onChange={(e) => setVatRate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Retail Markup (%)
                      </label>
                      <input
                        type="number"
                        value={markup}
                        onChange={(e) => setMarkup(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      Example: R1,000 cost → R{(1000 * (1 + parseFloat(vatRate) / 100) * (1 + parseFloat(markup) / 100)).toFixed(0)} retail
                    </p>
                  </>
                )}
              </div>

              {/* Right: Sample Products */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Sample Products ({currentSession.sampleProducts.length})
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {currentSession.sampleProducts.slice(0, 5).map((product, i) => (
                    <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="font-medium text-gray-800">{product.product_name}</p>
                      <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                      {product.brand && (
                        <p className="text-sm text-gray-600">Brand: {product.brand}</p>
                      )}
                      {product.retail_price && (
                        <p className="text-sm font-semibold text-green-600 mt-1">
                          R{product.retail_price.toFixed(2)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 rounded-2xl p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">🎓 Training Instructions</h3>
          <ol className="space-y-2 text-sm text-blue-800 list-decimal list-inside">
            <li>Upload one sample pricelist per supplier</li>
            <li>Review detected supplier name and price type</li>
            <li>Configure discount/markup rules</li>
            <li>Check sample products look correct</li>
            <li>Save profile - future uploads will use these rules automatically</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
