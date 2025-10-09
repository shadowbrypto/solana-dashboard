export const protocolColors: { [key: string]: string } = {
  bullx: "hsl(0 94% 65%)",      // Vibrant Red
  photon: "hsl(280 91% 65%)",   // Bright Purple
  trojan: "hsl(145 80% 42%)",   // Deep Green
  axiom: "hsl(45 93% 47%)",     // Golden Yellow
  gmgnai: "hsl(200 98% 50%)",   // Electric Blue
  bloom: "hsl(326 100% 59%)",   // Hot Pink
  bonkbot: "hsl(31 94% 52%)",   // Bright Orange
  nova: "hsl(168 83% 45%)",     // Turquoise
  soltradingbot: "hsl(142 76% 36%)", // Emerald
  maestro: "hsl(262 83% 58%)",  // Purple
  banana: "hsl(221 83% 53%)",   // Blue
  padre: "hsl(346 84% 61%)",    // Rose
  moonshot: "hsl(15 72% 50%)",  // Orange
  vector: "hsl(172 66% 50%)",   // Teal
  "nova terminal": "hsl(190 85% 50%)",     // Sky Blue
  "telemetry": "hsl(39 96% 60%)",   // Amber
  slingshot: "hsl(110 75% 45%)",           // Lime Green
  fomo: "hsl(270 95% 60%)",             // Electric Purple
  
  // EVM Protocol Colors (distinct from their Solana counterparts)
  sigma: "hsl(300 85% 55%)",            // Magenta
  sigma_evm: "hsl(300 85% 55%)",        // Magenta
  maestro_evm: "hsl(25 95% 60%)",       // Orange Red (different from regular maestro)
  bloom_evm: "hsl(160 90% 40%)",        // Forest Green (different from regular bloom)
  banana_evm: "hsl(50 100% 50%)",       // Bright Yellow (different from regular banana blue)
  photon_evm: "hsl(280 91% 65%)",       // Bright Purple (matching Solana photon)
};

export const protocolColorsList = Object.values(protocolColors);

export function getProtocolColor(protocolName: string): string {
  return protocolColors[protocolName.toLowerCase()] || protocolColors.bullx;
}
