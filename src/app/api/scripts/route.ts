import { NextRequest, NextResponse } from 'next/server';
import { getScripts, getScriptAggregateRating } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listed = searchParams.get('listed');
    let scripts = getScripts();
    if (listed === '1') {
      scripts = scripts.filter(s => s.isListedForSale);
    }
    // Append rating aggregation (if not cached)
    scripts = scripts.map(s => {
      if (s.averageRating === undefined || s.ratingCount === undefined) {
        const agg = getScriptAggregateRating(s.id);
        return { ...s, averageRating: agg.average, ratingCount: agg.count };
      }
      return s;
    });

    // If requesting store list, sort by rating (average score descending -> rating count descending -> creation time descending)
    if (listed === '1') {
      scripts.sort((a,b) => {
        const aAvg = a.averageRating ?? 0;
        const bAvg = b.averageRating ?? 0;
        if (bAvg !== aAvg) return bAvg - aAvg;
        const aCount = a.ratingCount ?? 0;
        const bCount = b.ratingCount ?? 0;
        if (bCount !== aCount) return bCount - aCount;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    }
    
    return NextResponse.json({
      success: true,
  scripts: scripts
    });
  } catch (error) {
    console.error('Failed to get script list:', error);
    return NextResponse.json({
      success: false,
      error: 'Server error'
    }, { status: 500 });
  }
}
