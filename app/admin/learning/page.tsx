'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, RefreshCw } from 'lucide-react';

interface LearningStats {
  total_products_tracked: number;
  high_performers: number;
  low_performers: number;
  average_add_rate: number;
  boosts: Array<{
    product_id: string;
    boost_multiplier: number;
    reason: string;
    score: {
      product_id: string;
      product_name?: string;
      product_sku?: string;
      relevance_score: number;
      add_rate: number;
      click_through_rate: number;
      times_shown: number;
    };
  }>;
}

export default function LearningDashboard() {
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/learning');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error fetching learning stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading learning statistics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No learning data available yet.</p>
          <p className="text-sm text-gray-500 mt-2">Start using the system to generate feedback data!</p>
        </div>
      </div>
    );
  }

  const highPerformers = stats.boosts
    .filter(b => b.boost_multiplier > 1.2)
    .sort((a, b) => b.boost_multiplier - a.boost_multiplier)
    .slice(0, 10);

  const lowPerformers = stats.boosts
    .filter(b => b.boost_multiplier < 0.9)
    .sort((a, b) => a.boost_multiplier - b.boost_multiplier)
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-purple-100 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              Learning Dashboard
            </h1>
            <p className="text-gray-600 mt-2">System intelligence based on user feedback</p>
          </div>
          <div className="text-right">
            <button
              onClick={fetchStats}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastUpdated}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Products Tracked</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.total_products_tracked}
              </p>
            </div>
            <BarChart3 className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Performers</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {stats.high_performers}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-500 opacity-20" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Boosted 1.2x - 2.0x</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Performers</p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {stats.low_performers}
              </p>
            </div>
            <TrendingDown className="w-12 h-12 text-red-500 opacity-20" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Lowered 0.5x - 0.9x</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Add Rate</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">
                {(stats.average_add_rate * 100).toFixed(1)}%
              </p>
            </div>
            <BarChart3 className="w-12 h-12 text-purple-500 opacity-20" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Products added to quote</p>
        </div>
      </div>

      {/* High Performers Table */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top 10 High Performers (Boosted in Search)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Boost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Add Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CTR
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Times Shown
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {highPerformers.map((item, idx) => (
                  <tr key={item.product_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.score.product_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">{item.score.product_sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {item.boost_multiplier.toFixed(2)}x
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(item.score.add_rate * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(item.score.click_through_rate * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.score.times_shown}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {item.reason.replace(/_/g, ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {highPerformers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No high performers yet. Keep testing!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Low Performers Table */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-orange-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Top 10 Low Performers (Lowered in Search)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Penalty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Add Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CTR
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Times Shown
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lowPerformers.map((item, idx) => (
                  <tr key={item.product_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.score.product_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">{item.score.product_sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        {item.boost_multiplier.toFixed(2)}x
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(item.score.add_rate * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(item.score.click_through_rate * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.score.times_shown}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {item.reason.replace(/_/g, ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lowPerformers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No low performers yet. Keep testing!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
