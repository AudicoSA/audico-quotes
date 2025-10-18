'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, XCircle, Circle } from 'lucide-react';
import type { SystemTemplate, SystemRequirement, RequirementStatus } from '@/lib/system-requirements';

interface SystemRequirementsProps {
  systemTemplate: SystemTemplate | null;
  onRequirementClick?: (requirement: SystemRequirement) => void;
}

export default function SystemRequirements({ systemTemplate, onRequirementClick }: SystemRequirementsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!systemTemplate) {
    return null;
  }

  const requirements = systemTemplate.requirements;
  const totalRequirements = requirements.filter(r => !r.optional).length;
  const completedRequirements = requirements.filter(r => !r.optional && r.status === 'complete').length;
  const criticalMissing = requirements.filter(r => r.status === 'critical').length;

  const getStatusIcon = (status: RequirementStatus, optional?: boolean) => {
    if (optional && status === 'missing') {
      return <Circle className="w-5 h-5 text-gray-400" />;
    }

    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'partial':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500 animate-pulse" />;
      case 'missing':
        return <XCircle className="w-5 h-5 text-orange-500" />;
    }
  };

  const getStatusColor = (status: RequirementStatus, optional?: boolean) => {
    if (optional && status === 'missing') {
      return 'text-gray-600 hover:bg-gray-50';
    }

    switch (status) {
      case 'complete':
        return 'text-green-700 bg-green-50 hover:bg-green-100';
      case 'partial':
        return 'text-yellow-700 bg-yellow-50 hover:bg-yellow-100';
      case 'critical':
        return 'text-red-700 bg-red-50 hover:bg-red-100';
      case 'missing':
        return 'text-orange-700 bg-orange-50 hover:bg-orange-100';
    }
  };

  const progressPercentage = totalRequirements > 0 ? (completedRequirements / totalRequirements) * 100 : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{systemTemplate.name}</h3>
            <p className="text-sm text-gray-600">{systemTemplate.use_case}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {criticalMissing > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded-full animate-pulse">
              {criticalMissing} critical
            </span>
          )}
          <span className="text-sm font-medium text-gray-600">
            {completedRequirements}/{totalRequirements}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Progress Bar */}
      <div className="px-4 pb-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              progressPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Requirements List */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {/* Budget Range */}
          {systemTemplate.budget_range && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Typical Budget:</span> {systemTemplate.budget_range}
              </p>
            </div>
          )}

          {/* Required Components */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Required Components
            </p>
            {requirements
              .filter(r => !r.optional)
              .map((req) => (
                <button
                  key={req.id}
                  onClick={() => onRequirementClick?.(req)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all ${getStatusColor(
                    req.status
                  )} ${req.status !== 'complete' ? 'cursor-pointer' : 'cursor-default'}`}
                  disabled={req.status === 'complete'}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(req.status, req.optional)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{req.name}</p>
                        {req.quantity_needed && req.quantity_needed > 1 && (
                          <span className="text-xs bg-white bg-opacity-50 px-2 py-0.5 rounded-full">
                            {req.quantity_have || 0}/{req.quantity_needed}
                          </span>
                        )}
                      </div>
                      <p className="text-xs opacity-80 mt-0.5">{req.description}</p>
                      {req.note && (
                        <p className="text-xs font-medium mt-1 opacity-90">💡 {req.note}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
          </div>

          {/* Optional Components */}
          {requirements.some(r => r.optional) && (
            <div className="space-y-1 mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Optional Components
              </p>
              {requirements
                .filter(r => r.optional)
                .map((req) => (
                  <button
                    key={req.id}
                    onClick={() => onRequirementClick?.(req)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all ${getStatusColor(
                      req.status,
                      req.optional
                    )} cursor-pointer opacity-75 hover:opacity-100`}
                  >
                    <div className="flex items-start gap-3">
                      {getStatusIcon(req.status, req.optional)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{req.name}</p>
                        <p className="text-xs opacity-80 mt-0.5">{req.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}

          {/* System Complete Message */}
          {completedRequirements === totalRequirements && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
              <p className="text-sm text-green-800 font-medium">
                ✅ All required components selected! Your {systemTemplate.name.toLowerCase()} is complete.
              </p>
            </div>
          )}

          {/* Critical Warning */}
          {criticalMissing > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
              <p className="text-sm text-red-800 font-medium">
                ⚠️ {criticalMissing} critical component{criticalMissing > 1 ? 's' : ''} missing - system will not
                function without {criticalMissing > 1 ? 'these' : 'this'}!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
