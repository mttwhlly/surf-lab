'use client';

import { SurfData } from '../../types/surf';
import { Card } from '../ui/Card';
import { LoadingShimmer } from '../ui/LoadingShimmer';

interface StatusCardProps {
  data: SurfData | null;
  loading: boolean;
}

export function StatusCard({ data, loading }: StatusCardProps) {
  return (
    <Card variant="status" className="mb-8">
      <LoadingShimmer isLoading={loading}>
        <div className="rating text-3xl font-bold mb-3 uppercase tracking-wide">
          {data?.rating || 'Loading...'}
        </div>
      </LoadingShimmer>
      
      <LoadingShimmer isLoading={loading}>
        <div className="duration text-base opacity-90 font-medium">
          {data?.goodSurfDuration || 'Checking conditions...'}
        </div>
      </LoadingShimmer>
      
      {data?.score && !loading && (
        <div className="mt-3 text-sm opacity-70">
          Score: {data.score}/100
        </div>
      )}
    </Card>
  );
}