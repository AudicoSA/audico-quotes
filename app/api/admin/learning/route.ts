/**
 * Admin Dashboard - Learning Statistics
 * View what the system has learned from feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLearningStats } from '@/lib/learning-algorithm';

export async function GET(request: NextRequest) {
  try {
    const stats = await getLearningStats();

    return NextResponse.json({
      success: true,
      stats,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Admin Learning] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get learning stats' },
      { status: 500 }
    );
  }
}
