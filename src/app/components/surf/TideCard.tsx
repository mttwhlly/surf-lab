'use client';

import { SurfData } from '@/app/types/surf';
import { Card } from '../ui/Card';
import { LoadingShimmer } from '../ui/LoadingShimmer';
import { TideVisualizer } from '../animations/TideVisualizer';

interface TideCardProps {
  data: SurfData | null;
  loading: boolean;
}

export function TideCard({ data, loading }: TideCardProps) {
  if (!data?.tides && !loading) return null;

  const tideData = data?.tides;

  return (
    <Card variant="tide" className="mb-8">
      <div className="tide-header flex items-center justify-center gap-3 relative z-10">
        <div className="tide-title text-xs uppercase tracking-wider opacity-80 mb-2 font-semibold">
          Tide
        </div>
      </div>
      
      <div className="tide-current text-center mb-4 relative z-10">
        <LoadingShimmer isLoading={loading}>
          <div className="tide-height text-2xl font-semibold mb-1">
            {tideData?.current_height_ft || '--'} ft
          </div>
        </LoadingShimmer>
        <LoadingShimmer isLoading={loading}>
          <div className="tide-state text-sm uppercase tracking-wider opacity-80 font-medium">
            {tideData?.state || 'Loading'}
          </div>
        </LoadingShimmer>
      </div>
      
      <div className="tide-visual-container relative h-32 my-4 bg-white/5 rounded-2xl overflow-hidden border border-white/10">
        {tideData && !loading && (
          <TideVisualizer
            currentHeight={tideData.current_height_ft}
            state={tideData.state}
            nextHigh={tideData.next_high}
            nextLow={tideData.next_low}
          />
        )}
      </div>
      
      <div className="tide-predictions grid grid-cols-2 gap-4 relative z-10">
        <div className="tide-prediction text-center p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="tide-prediction-label text-xs uppercase tracking-wider opacity-80 mb-1 font-semibold">
            Next High
          </div>
          <LoadingShimmer isLoading={loading}>
            <div className="tide-prediction-time text-base font-semibold mb-1">
              {tideData?.next_high?.time || '--'}
            </div>
          </LoadingShimmer>
          <LoadingShimmer isLoading={loading}>
            <div className="tide-prediction-height text-sm opacity-80">
              {tideData?.next_high?.height ? `${tideData.next_high.height} ft` : '-- ft'}
            </div>
          </LoadingShimmer>
        </div>
        
        <div className="tide-prediction text-center p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="tide-prediction-label text-xs uppercase tracking-wider opacity-80 mb-1 font-semibold">
            Next Low
          </div>
          <LoadingShimmer isLoading={loading}>
            <div className="tide-prediction-time text-base font-semibold mb-1">
              {tideData?.next_low?.time || '--'}
            </div>
          </LoadingShimmer>
          <LoadingShimmer isLoading={loading}>
            <div className="tide-prediction-height text-sm opacity-80">
              {tideData?.next_low?.height ? `${tideData.next_low.height} ft` : '-- ft'}
            </div>
          </LoadingShimmer>
        </div>
      </div>
    </Card>
  );
}