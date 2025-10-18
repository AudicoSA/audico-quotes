'use client';

import { useState } from 'react';
import { Upload, FileSpreadsheet, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function PricelistAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [trainedSuppliers, setTrainedSuppliers] = useState<string[]>([]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'KinkyKong-123') {
      setIsAuthenticated(true);
      setError('');
      loadTrainedSuppliers();
    } else {
      setError('Invalid password');
    }
  };

  const loadTrainedSuppliers = async () => {
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

    setUploading(true);
    setResult(null);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/pricelist/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Pricelist Admin</h1>
            <p className="text-gray-600 mt-2">Enter password to access</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              Access Admin
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Pricelist Upload</h1>
              <p className="text-gray-600 mt-1">Upload supplier pricelists (PDF or Excel)</p>
            </div>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Trained Suppliers */}
        {trainedSuppliers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              ✅ Trained Suppliers ({trainedSuppliers.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {trainedSuppliers.map((supplier) => (
                <div
                  key={supplier}
                  className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                >
                  <CheckCircle className="w-3 h-3" />
                  {supplier}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-3">
              💡 New supplier? <a href="/admin/pricelist/setup" className="text-purple-600 hover:underline">Train it first</a>
            </p>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-purple-500 transition-colors">
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {uploading ? (
                  <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
                ) : (
                  <Upload className="w-10 h-10 text-purple-600" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {uploading ? 'Processing...' : 'Click to upload or drag and drop'}
              </h3>
              <p className="text-gray-600 mb-4">
                PDF, Excel (.xlsx, .xls), or CSV files
              </p>
              <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>PDF</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Excel</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>CSV</span>
                </div>
              </div>
            </label>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-800">Upload Failed</h4>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Success Display */}
          {result && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-800 text-lg">Upload Successful!</h4>
                  <p className="text-green-600 text-sm mt-1">
                    Pricelist processed and products synced to database
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="text-2xl font-bold text-green-600">
                    {result.products_extracted || 0}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Extracted</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.products_saved || 0}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Saved</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="text-2xl font-bold text-purple-600">
                    {result.products_updated || 0}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Updated</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="text-2xl font-bold text-orange-600">
                    {result.products_skipped || 0}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Skipped</div>
                </div>
              </div>

              {result.warnings && result.warnings.length > 0 && (
                <div className="mt-4 bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <h5 className="font-semibold text-yellow-800 mb-2">Warnings ({result.warnings.length})</h5>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {result.warnings.slice(0, 5).map((warning: string, i: number) => (
                      <li key={i}>• {warning}</li>
                    ))}
                    {result.warnings.length > 5 && (
                      <li className="text-yellow-600">... and {result.warnings.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              {result.session_id && (
                <div className="mt-4 text-sm text-gray-600">
                  Session ID: <code className="bg-gray-100 px-2 py-1 rounded">{result.session_id}</code>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-blue-50 rounded-2xl p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">📋 Supported Formats</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✅ <strong>PDF:</strong> Automatically converted to images and processed with AI</li>
            <li>✅ <strong>Excel (.xlsx, .xls):</strong> Direct parsing of tables and data</li>
            <li>✅ <strong>CSV:</strong> Comma-separated values with header detection</li>
            <li>💡 <strong>Tip:</strong> Excel files are faster and cheaper to process than PDFs</li>
            <li>💡 <strong>Note:</strong> First upload learns the format, subsequent uploads are faster</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
