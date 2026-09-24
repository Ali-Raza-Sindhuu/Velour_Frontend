// JazzCash wordmark, drawn inline so it stays crisp at any size and costs no
// extra request. If we're given the official asset, swap the <svg> below for
// an <img> here and every use of the mark updates with it.
//
// The two halves are tspans of one text node so the font kerns them as a
// single word — positioning them separately leaves a gap.
const JazzCashLogo = ({ height = 16, mono = false, className = "" }) => (
  <svg
    viewBox="0 0 108 28"
    height={height}
    role="img"
    aria-label="JazzCash"
    className={className}
    style={{ display: "block", width: "auto" }}
  >
    <text
      x="0"
      y="21"
      fontFamily='"Segoe UI", Roboto, -apple-system, BlinkMacSystemFont, sans-serif'
      fontSize="23"
      fontWeight="700"
      letterSpacing="-0.6"
    >
      <tspan fill={mono ? "currentColor" : "#c8102e"}>Jazz</tspan>
      <tspan fill={mono ? "currentColor" : "#1a1a1a"}>Cash</tspan>
    </text>
  </svg>
);

export default JazzCashLogo;
