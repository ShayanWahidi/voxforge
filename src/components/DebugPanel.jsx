const DebugPanel = ({ timings }) => {
  const fmt = (v) => (v == null ? '-' : `${Math.round(v)}ms`)
  const rows = [
    { label: 'Embedding', value: timings?.embeddingMs },
    { label: 'Qdrant search', value: timings?.qdrantMs },
    { label: 'Gemini', value: timings?.geminiMs },
    { label: 'Rime TTS', value: timings?.rimeMs },
    { label: 'Backend total', value: timings?.totalBackendMs },
    { label: 'Network overhead', value: timings?.networkOverheadMs },
    { label: 'Full round trip', value: timings?.clientRoundTripMs },
  ]
  return (
    <div
      style={{
        width: '100%',
        background: '#141210',
        border: '1px solid rgba(242, 238, 233, 0.08)',
        borderRadius: '12px',
        padding: '16px 20px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '12.5px',
        textAlign: 'left',
        opacity: 0.9,
      }}
    >
      <h3
        style={{
          margin: '0 0 10px',
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: '12px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        Debug Latency
      </h3>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td style={{ padding: '2px 12px 2px 0', color: 'var(--muted)' }}>
                {r.label}
              </td>
              <td
                style={{
                  padding: '2px 0',
                  color: 'var(--orange)',
                  textAlign: 'right',
                }}
              >
                {fmt(r.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DebugPanel
