import clsx from 'clsx';

const BANDS = [
  { label: 'Very High Confidence', range: '≥80%',   color: 'bg-confidence-very-high', text: 'text-confidence-very-high' },
  { label: 'High Confidence',      range: '60–79%',  color: 'bg-confidence-high',      text: 'text-confidence-high'      },
  { label: 'Moderate Confidence',  range: '40–59%',  color: 'bg-confidence-moderate',  text: 'text-confidence-moderate'  },
  { label: 'Low Confidence',       range: '20–39%',  color: 'bg-confidence-low',       text: 'text-confidence-low'       },
  { label: 'Very Low Confidence',  range: '<20%',    color: 'bg-confidence-very-low',  text: 'text-confidence-very-low'  },
];

export default function ConfidenceLegend({ mode = 'confidence' }) {
  const bustBands = [
    { label: 'Very High Risk',  range: '≥75%',   color: 'bg-risk-high',             text: 'text-risk-high'             },
    { label: 'High Risk',       range: '55–74%',  color: 'bg-orange-500',            text: 'text-orange-400'            },
    { label: 'Moderate Risk',   range: '35–54%',  color: 'bg-amber-400',             text: 'text-amber-400'             },
    { label: 'Low Risk',        range: '15–34%',  color: 'bg-confidence-high',       text: 'text-confidence-high'       },
    { label: 'Very Low Risk',   range: '<15%',    color: 'bg-confidence-very-high',  text: 'text-confidence-very-high'  },
  ];

  const bands = mode === 'bust' ? bustBands : BANDS;
  const title = mode === 'bust' ? 'Bust Risk' : 'Forecast Confidence';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      border: '1px solid #b0bec5',
      borderRadius: '8px',
      padding: '10px 12px',
      width: '178px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      fontFamily: 'Inter,sans-serif',
    }}>
      <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', marginBottom: '8px' }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {bands.map(b => (
          <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={clsx('w-3 h-3 rounded-sm flex-shrink-0', b.color)} />
            <div>
              <div style={{ fontSize: '11px', color: '#1e293b', lineHeight: 1.3 }}>{b.label}</div>
              <div className={clsx('font-mono', b.text)} style={{ fontSize: '10px' }}>{b.range}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

