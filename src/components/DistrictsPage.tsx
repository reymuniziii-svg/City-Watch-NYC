import React, { useEffect, useState } from 'react';
import { Loader2, MapPinned, ArrowRight } from 'lucide-react';
import DistrictExplorerMap, { type DistrictMapData } from './DistrictExplorerMap';

export default function DistrictsPage() {
  const [districtMap, setDistrictMap] = useState<DistrictMapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadDistrictMap() {
      try {
        const response = await fetch('/data/district-map.geojson');
        if (!response.ok) {
          throw new Error('Failed to load district map data.');
        }

        const data = await response.json();
        if (!isCancelled) {
          setDistrictMap(data);
        }
      } catch (loadError) {
        if (!isCancelled) {
          console.error('Error loading district map:', loadError);
          setError('District map data is unavailable right now.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadDistrictMap();

    return () => {
      isCancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-black" />
        <p className="font-medium text-slate-500">Loading district map...</p>
      </div>
    );
  }

  if (error || !districtMap) {
    return (
      <div className="border-editorial bg-white px-6 py-20 text-center">
        <p className="text-lg font-bold text-black">District map unavailable</p>
        <p className="mt-2 text-slate-600">{error ?? 'We could not load the district map.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 border-editorial px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-black">
            <MapPinned className="h-3 w-3" />
            <span>District Explorer</span>
          </div>
          <h1 className="font-editorial text-5xl font-black tracking-tighter text-black">Explore NYC council districts</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Browse all {districtMap.features.length} council districts on the map, then click any district to jump
            straight to that member&apos;s dashboard.
          </p>
        </div>

        <div className="border-editorial bg-black px-6 py-4 text-sm text-white">
          <p className="font-bold uppercase tracking-widest text-[10px] text-slate-400 mb-2">How to use it</p>
          <p className="flex items-center gap-2 text-white">
            Hover to see the district number
            <ArrowRight className="h-4 w-4" />
            click to open the member page
          </p>
        </div>
      </div>

      <div className="overflow-hidden border-editorial bg-white">
        <DistrictExplorerMap districtMap={districtMap} />
      </div>
    </div>
  );
}
