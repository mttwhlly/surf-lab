'use client';

import { SurfData } from '../../types/surf';
import { Card } from '../ui/Card';
import { LoadingShimmer } from '../ui/LoadingShimmer';
import { TideChart } from '../animations/TideChart';

interface TideCardProps {
  data: SurfData | null;
  loading: boolean;
}

export function TideCard({ data, loading }: TideCardProps) {
  if (!data?.tides && !loading) return null;

  const tideData = data?.tides;

  return (
    <Card variant="tide" className="mb-8">
      <div className="flex items-center justify-center gap-3 relative z-10">
        <div className="text-xs uppercase tracking-wider opacity-80 mb-2 font-semibold">
          Tide
        </div>
      </div>
      
      <div className="text-center mb-4 relative z-10">

          <div className="text-2xl font-semibold mb-1">
            {tideData?.current_height_ft || '--'} ft
          </div>
        

          <div className="text-sm uppercase tracking-wider opacity-80 font-medium">
            {tideData?.state || 'Loading'}
          </div>
        
      </div>
      
      <div className="relative h-32 my-4 bg-white/5 rounded-2xl overflow-hidden border border-white/10">
        {!loading && tideData && <TideChart tideData={tideData} />}
      </div>
      
      <div className="tide-predictions grid grid-cols-2 gap-4 relative z-10">
        <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-xs uppercase tracking-wider opacity-80 mb-1 font-semibold">
            Next High
          </div>
  
            <div className="text-base font-semibold mb-1">
              {tideData?.next_high?.time || '--'}
            </div>
          
  
            <div className="text-sm opacity-80">
              {tideData?.next_high?.height ? `${tideData.next_high.height} ft` : '-- ft'}
            </div>
          
        </div>
        
        <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-xs uppercase tracking-wider opacity-80 mb-1 font-semibold">
            Next Low
          </div>
  
            <div className="text-base font-semibold mb-1">
              {tideData?.next_low?.time || '--'}
            </div>
          
  
            <div className="text-sm opacity-80">
              {tideData?.next_low?.height ? `${tideData.next_low.height} ft` : '-- ft'}
            </div>
          
        </div>
      </div>
    </Card>
  );
}