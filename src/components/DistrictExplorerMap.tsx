import { useEffect } from 'react';
import L from 'leaflet';
import { CircleMarker, GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';

export interface DistrictMapFeature {
  type: 'Feature';
  properties?: {
    coundist?: string;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: unknown;
  };
}

export interface DistrictMapData {
  type: 'FeatureCollection';
  features: DistrictMapFeature[];
}

interface DistrictExplorerMapProps {
  districtMap: DistrictMapData;
  activeDistrict?: number | null;
  selectedPoint?: [number, number] | null;
}

function MapViewport({ activeDistrict, districtMap, selectedPoint }: Required<Pick<DistrictExplorerMapProps, 'districtMap'>> & Omit<DistrictExplorerMapProps, 'districtMap'>) {
  const map = useMap();

  useEffect(() => {
    const activeFeature = activeDistrict
      ? districtMap.features.find((feature) => Number.parseInt(feature.properties?.coundist ?? '', 10) === activeDistrict)
      : null;

    if (selectedPoint) {
      map.flyTo([selectedPoint[1], selectedPoint[0]], 13, {
        duration: 0.7,
      });
      return;
    }

    if (activeFeature) {
      const bounds = L.geoJSON(activeFeature as never).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          maxZoom: 12,
          padding: [24, 24],
        });
      }
      return;
    }

    map.flyTo([40.7128, -74.006], 10, {
      duration: 0.7,
    });
  }, [activeDistrict, districtMap, map, selectedPoint]);

  return null;
}

export default function DistrictExplorerMap({
  districtMap,
  activeDistrict = null,
  selectedPoint = null,
}: DistrictExplorerMapProps) {
  const navigate = useNavigate();

  return (
    <MapContainer
      center={[40.7128, -74.006]}
      zoom={10}
      className="h-[32rem] w-full"
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl
    >
      <TileLayer
        url="https://maps.nyc.gov/xyz/1.0.0/carto/basemap/{z}/{x}/{y}.jpg"
        attribution='&copy; <a href="https://maps.nyc.gov/tiles/">NYC Map Tiles</a>'
      />
      <GeoJSON
        data={districtMap as never}
        onEachFeature={(feature, layer) => {
          const districtNumber = Number.parseInt(
            ((feature as DistrictMapFeature).properties?.coundist ?? ''),
            10,
          );

          if (!Number.isFinite(districtNumber)) {
            return;
          }

          layer.bindTooltip(`District ${districtNumber}`, {
            sticky: true,
          });

          layer.on({
            mouseover: () => {
              const element = (layer as L.Path).getElement?.() as SVGElement | null;
              if (element) {
                element.style.cursor = 'pointer';
              }
            },
            click: () => {
              navigate(`/members/district/${districtNumber}`);
            },
          });
        }}
        style={(feature) => {
          const districtNumber = Number.parseInt(
            ((feature as DistrictMapFeature | undefined)?.properties?.coundist ?? ''),
            10,
          );
          const isActive = districtNumber === activeDistrict;

          return {
            color: isActive ? '#000000' : '#000000',
            weight: isActive ? 3 : 1,
            fillColor: isActive ? '#000000' : '#000000',
            fillOpacity: isActive ? 0.2 : 0.05,
          };
        }}
      />
      {selectedPoint ? (
        <CircleMarker
          center={[selectedPoint[1], selectedPoint[0]]}
          radius={8}
          pathOptions={{
            color: '#ffffff',
            weight: 3,
            fillColor: '#000000',
            fillOpacity: 1,
          }}
        />
      ) : null}
      <TileLayer url="https://maps.nyc.gov/xyz/1.0.0/carto/labels/{z}/{x}/{y}.png" opacity={0.9} />
      <MapViewport activeDistrict={activeDistrict} districtMap={districtMap} selectedPoint={selectedPoint} />
    </MapContainer>
  );
}
