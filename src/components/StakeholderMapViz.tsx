interface Sponsor {
  slug: string;
  fullName: string;
}

interface TopDonor {
  donorName: string;
  industry: string;
  totalToSponsors: number;
}

interface StakeholderMapVizProps {
  billIntroNumber: string;
  sponsors: Sponsor[];
  committee: string;
  committeChair?: string;
  topDonors?: TopDonor[];
}

// Colors matching project Tailwind palette
const COLORS = {
  bill: '#000000',        // black
  sponsor: '#334155',     // slate-700
  donor: '#94a3b8',       // slate-400
  chair: '#059669',       // emerald-600
  line: '#cbd5e1',        // slate-300
  labelText: '#334155',   // slate-700
};

function truncateLabel(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '\u2026' : text;
}

function formatAmount(value: number): string {
  if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(1) + 'M';
  if (value >= 1_000) return '$' + Math.round(value / 1_000) + 'k';
  return '$' + Math.round(value);
}

export default function StakeholderMapViz({
  billIntroNumber,
  sponsors,
  committee,
  committeChair,
  topDonors,
}: StakeholderMapVizProps) {
  if (sponsors.length < 2) {
    return (
      <section className="border-editorial bg-white p-6">
        <h3 className="font-editorial text-2xl font-bold text-black mb-2">Stakeholder Map</h3>
        <p className="text-sm text-slate-500">
          Not enough data to render a stakeholder map. At least 2 sponsors are required.
        </p>
      </section>
    );
  }

  const cx = 400;
  const cy = 320;

  // Bill node dimensions
  const billW = 140;
  const billH = 40;

  // Sponsor ring
  const sponsorRadius = 160;
  const sponsorNodeR = 22;
  const sponsorPositions = sponsors.map((s, i) => {
    const angle = (2 * Math.PI * i) / sponsors.length - Math.PI / 2;
    return {
      ...s,
      x: cx + sponsorRadius * Math.cos(angle),
      y: cy + sponsorRadius * Math.sin(angle),
      angle,
    };
  });

  // Donor ring -- cap at 20
  const visibleDonors = (topDonors ?? []).slice(0, 20);
  const donorRadius = 270;
  const donorNodeR = 14;

  // Distribute donors around sponsors they belong to, or evenly around the ring
  const donorPositions = visibleDonors.map((d, i) => {
    const angle = (2 * Math.PI * i) / Math.max(visibleDonors.length, 1) - Math.PI / 2;
    return {
      ...d,
      x: cx + donorRadius * Math.cos(angle),
      y: cy + donorRadius * Math.sin(angle),
      angle,
    };
  });

  // Chair position -- top center
  const chairX = cx;
  const chairY = 50;
  const chairSize = 18;

  return (
    <section className="border-editorial bg-white p-6">
      <div className="mb-4">
        <h3 className="font-editorial text-2xl font-bold text-black">Stakeholder Map</h3>
        <p className="mt-1 text-sm text-slate-500">
          {billIntroNumber} network: sponsors, top donors, and committee chair
        </p>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox="0 0 800 600"
          className="w-full h-auto"
          style={{ maxHeight: 600 }}
          role="img"
          aria-label={`Stakeholder map for ${billIntroNumber}`}
        >
          {/* Connection lines */}
          {/* Bill -> Sponsors */}
          {sponsorPositions.map((sp) => (
            <line
              key={`bill-sp-${sp.slug}`}
              x1={cx}
              y1={cy}
              x2={sp.x}
              y2={sp.y}
              stroke={COLORS.line}
              strokeWidth={1.5}
            />
          ))}

          {/* Sponsors -> Donors: connect each donor to its closest sponsor */}
          {donorPositions.map((dp, di) => {
            // Find the closest sponsor by angle
            let closestSp = sponsorPositions[0];
            let minDist = Infinity;
            for (const sp of sponsorPositions) {
              const dist = Math.hypot(sp.x - dp.x, sp.y - dp.y);
              if (dist < minDist) {
                minDist = dist;
                closestSp = sp;
              }
            }
            return (
              <line
                key={`sp-dn-${di}`}
                x1={closestSp.x}
                y1={closestSp.y}
                x2={dp.x}
                y2={dp.y}
                stroke={COLORS.line}
                strokeWidth={1}
                strokeDasharray="4 3"
              />
            );
          })}

          {/* Bill -> Committee Chair */}
          {committeChair && (
            <line
              x1={cx}
              y1={cy - billH / 2}
              x2={chairX}
              y2={chairY + chairSize}
              stroke={COLORS.chair}
              strokeWidth={1.5}
              strokeDasharray="6 3"
            />
          )}

          {/* Donor nodes */}
          {donorPositions.map((dp, i) => (
            <g key={`donor-${i}`}>
              <circle
                cx={dp.x}
                cy={dp.y}
                r={donorNodeR}
                fill={COLORS.donor}
              />
              <text
                x={dp.x}
                y={dp.y + donorNodeR + 12}
                textAnchor="middle"
                fontSize={8}
                fill={COLORS.labelText}
              >
                {truncateLabel(dp.donorName, 16)}
              </text>
              <text
                x={dp.x}
                y={dp.y + donorNodeR + 22}
                textAnchor="middle"
                fontSize={7}
                fill={COLORS.donor}
              >
                {formatAmount(dp.totalToSponsors)}
              </text>
            </g>
          ))}

          {/* Sponsor nodes */}
          {sponsorPositions.map((sp) => (
            <g key={`sponsor-${sp.slug}`}>
              <circle
                cx={sp.x}
                cy={sp.y}
                r={sponsorNodeR}
                fill={COLORS.sponsor}
              />
              <text
                x={sp.x}
                y={sp.y + 4}
                textAnchor="middle"
                fontSize={9}
                fill="#fff"
                fontWeight="bold"
              >
                {truncateLabel(sp.fullName.split(' ').pop() ?? '', 10)}
              </text>
              <text
                x={sp.x}
                y={sp.y + sponsorNodeR + 14}
                textAnchor="middle"
                fontSize={9}
                fill={COLORS.labelText}
                fontWeight="500"
              >
                {truncateLabel(sp.fullName, 18)}
              </text>
            </g>
          ))}

          {/* Bill node (center rectangle) */}
          <rect
            x={cx - billW / 2}
            y={cy - billH / 2}
            width={billW}
            height={billH}
            rx={4}
            fill={COLORS.bill}
          />
          <text
            x={cx}
            y={cy + 5}
            textAnchor="middle"
            fontSize={13}
            fill="#fff"
            fontWeight="bold"
          >
            {billIntroNumber}
          </text>

          {/* Committee Chair node (diamond) */}
          {committeChair && (
            <g>
              <polygon
                points={`${chairX},${chairY - chairSize} ${chairX + chairSize},${chairY} ${chairX},${chairY + chairSize} ${chairX - chairSize},${chairY}`}
                fill={COLORS.chair}
              />
              <text
                x={chairX}
                y={chairY + chairSize + 14}
                textAnchor="middle"
                fontSize={10}
                fill={COLORS.chair}
                fontWeight="bold"
              >
                {truncateLabel(committeChair, 22)}
              </text>
              <text
                x={chairX}
                y={chairY + chairSize + 26}
                textAnchor="middle"
                fontSize={8}
                fill={COLORS.labelText}
              >
                Committee Chair
              </text>
            </g>
          )}

          {/* Legend */}
          <g transform="translate(16, 560)">
            <rect x={0} y={0} width={10} height={10} rx={2} fill={COLORS.bill} />
            <text x={14} y={9} fontSize={9} fill={COLORS.labelText}>Bill</text>

            <circle cx={60} cy={5} r={5} fill={COLORS.sponsor} />
            <text x={68} y={9} fontSize={9} fill={COLORS.labelText}>Sponsor</text>

            <circle cx={130} cy={5} r={5} fill={COLORS.donor} />
            <text x={138} y={9} fontSize={9} fill={COLORS.labelText}>Donor</text>

            <polygon points="200,0 205,5 200,10 195,5" fill={COLORS.chair} />
            <text x={210} y={9} fontSize={9} fill={COLORS.labelText}>Chair</text>
          </g>
        </svg>
      </div>
    </section>
  );
}
