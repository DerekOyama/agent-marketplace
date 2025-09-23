"use client";

import { useState } from "react";

interface FloatingSidebarProps {
  onNavigate: (path: string) => void;
}

export default function FloatingSidebar({ onNavigate }: FloatingSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMenuClick = (path: string) => {
    onNavigate(path);
  };

  return (
    <div className="fixed left-0 top-0 h-full z-30">
      <div className={`bg-white shadow-lg border-r border-gray-200 transition-all duration-300 h-full ${
        isExpanded ? 'w-64' : 'w-16'
      }`}>
        
        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <svg className={`w-6 h-6 text-gray-600 transition-transform duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Menu Items */}
        <div className="px-2 pb-2">
          {/* Credit History */}
          <button
            onClick={() => handleMenuClick('credit-history')}
            className={`w-full p-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center ${
              isExpanded ? 'space-x-3' : 'justify-center'
            }`}
            title={!isExpanded ? "Credit History" : ""}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {isExpanded && (
              <span className="text-sm font-medium text-gray-700">Credit History</span>
            )}
          </button>

          {/* Connect N8N */}
          <button
            onClick={() => handleMenuClick('n8n-connect')}
            className={`w-full p-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center ${
              isExpanded ? 'space-x-3' : 'justify-center'
            }`}
            title={!isExpanded ? "Connect N8N" : ""}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {isExpanded && (
              <span className="text-sm font-medium text-gray-700">Connect N8N</span>
            )}
          </button>

          {/* Admin Panel */}
          <button
            onClick={() => handleMenuClick('admin-panel')}
            className={`w-full p-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center ${
              isExpanded ? 'space-x-3' : 'justify-center'
            }`}
            title={!isExpanded ? "Admin Panel" : ""}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {isExpanded && (
              <span className="text-sm font-medium text-gray-700">Admin Panel</span>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}
