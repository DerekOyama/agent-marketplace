'use client';

import { useState, useEffect } from 'react';

interface RequestLog {
  method: string;
  path: string;
  responseStatus?: number;
  duration: number;
  errorCode?: string;
  timestamp: string;
}

interface DashboardMetrics {
  requestLogs: {
    logs: RequestLog[];
    total: number;
    hasMore: boolean;
  };
  errorStats: Array<{
    errorCode: string;
    count: number;
  }>;
  performanceStats: {
    totalRequests: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

interface PerformanceMetrics {
  performanceMetrics: {
    totalRequests: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
    successRate: number;
    errorRate: number;
  };
  requestLogs: {
    logs: RequestLog[];
    total: number;
    hasMore: boolean;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

interface ErrorMetrics {
  errorStats: Array<{
    errorCode: string;
    count: number;
  }>;
  errorLogs: {
    logs: RequestLog[];
    total: number;
    hasMore: boolean;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

export default function AnalyticsPage() {
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [errorMetrics, setErrorMetrics] = useState<ErrorMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboardRes, performanceRes, errorRes] = await Promise.all([
        fetch('/api/analytics/dashboard'),
        fetch('/api/analytics/performance'),
        fetch('/api/analytics/errors')
      ]);

      if (!dashboardRes.ok || !performanceRes.ok || !errorRes.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const [dashboard, performance, errors] = await Promise.all([
        dashboardRes.json(),
        performanceRes.json(),
        errorRes.json()
      ]);

      setDashboardMetrics(dashboard.data);
      setPerformanceMetrics(performance.data);
      setErrorMetrics(errors.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error loading analytics</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchMetrics}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Monitor API performance, errors, and usage patterns
          </p>
        </div>

        {/* Overview Cards */}
        {dashboardMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-medium">R</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Requests</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {dashboardMetrics.performanceStats.totalRequests.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm font-medium">T</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {Math.round(dashboardMetrics.performanceStats.avgDuration)}ms
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 text-sm font-medium">E</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Error Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {performanceMetrics ? `${performanceMetrics.performanceMetrics.errorRate.toFixed(1)}%` : '0%'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 text-sm font-medium">S</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Success Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {performanceMetrics ? `${performanceMetrics.performanceMetrics.successRate.toFixed(1)}%` : '100%'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Performance Metrics */}
          {performanceMetrics && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Performance Metrics</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">P50 Duration</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {Math.round(performanceMetrics.performanceMetrics.p50Duration)}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">P95 Duration</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {Math.round(performanceMetrics.performanceMetrics.p95Duration)}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">P99 Duration</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {Math.round(performanceMetrics.performanceMetrics.p99Duration)}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Max Duration</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {Math.round(performanceMetrics.performanceMetrics.maxDuration)}ms
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Statistics */}
          {errorMetrics && errorMetrics.errorStats.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Error Statistics</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {errorMetrics.errorStats.slice(0, 5).map((error, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">{error.errorCode}</span>
                      <span className="text-sm text-gray-500">{error.count} occurrences</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Requests */}
        {dashboardMetrics && dashboardMetrics.requestLogs.logs.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Requests</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Path
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Error
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardMetrics.requestLogs.logs.slice(0, 10).map((log, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.method === 'GET' ? 'bg-green-100 text-green-800' :
                          log.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                          log.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                          log.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.path}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.responseStatus && log.responseStatus >= 200 && log.responseStatus < 300 ? 'bg-green-100 text-green-800' :
                          log.responseStatus && log.responseStatus >= 400 ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {log.responseStatus || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.duration}ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {log.errorCode ? (
                          <span className="text-red-600 font-medium">{log.errorCode}</span>
                        ) : (
                          <span className="text-green-600">Success</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={fetchMetrics}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Metrics
          </button>
        </div>
      </div>
    </div>
  );
}
