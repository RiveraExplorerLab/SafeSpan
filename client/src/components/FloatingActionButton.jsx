/**
 * FloatingActionButton - Mobile FAB for quick actions
 * Positioned above the bottom nav on mobile
 */

import { useState } from 'react';

export default function FloatingActionButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed right-4 bottom-20 md:hidden z-40 w-14 h-14 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95"
      aria-label="Add transaction"
    >
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
}
