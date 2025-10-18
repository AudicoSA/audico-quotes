/**
 * Admin Dashboard - Learning Statistics
 * View what the system has learned from feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLearningStats } from '@/lib/learning-algorithm';

export async function GET() {
  try {
    const stats = await getLearningStats();

    return NextResponse.json({
      success: true,
      stats,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Admin Learning] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get learning stats' },
      { status: 500 }
    );
  }
}
