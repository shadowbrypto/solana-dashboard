import React from 'react';
import { ProtocolLogo } from './ProtocolLogo';
import { 
  Bot, Sword, Wand2, Star, Rocket, Banana, Zap,
  BarChart2, Aperture, CalendarClock, Cross, Moon,
  ArrowUpRight, Terminal, BotMessageSquare, Crosshair,
  TrendingUp
} from 'lucide-react';

// Create individual protocol logo components
export const BonkBotIcon = (props: any) => (
  <ProtocolLogo protocolId="bonkbot" protocolName="BonkBot" fallbackIcon={Bot} {...props} />
);

export const TrojanIcon = (props: any) => (
  <ProtocolLogo protocolId="trojan" protocolName="Trojan" fallbackIcon={Sword} {...props} />
);

export const BloomIcon = (props: any) => (
  <ProtocolLogo protocolId="bloom" protocolName="Bloom" fallbackIcon={Wand2} {...props} />
);

export const NovaIcon = (props: any) => (
  <ProtocolLogo protocolId="nova" protocolName="Nova" fallbackIcon={Star} {...props} />
);

export const SolTradingBotIcon = (props: any) => (
  <ProtocolLogo protocolId="soltradingbot" protocolName="SolTradingBot" fallbackIcon={Rocket} {...props} />
);

export const BananaIcon = (props: any) => (
  <ProtocolLogo protocolId="banana" protocolName="Banana" fallbackIcon={Banana} {...props} />
);

export const MaestroIcon = (props: any) => (
  <ProtocolLogo protocolId="maestro" protocolName="Maestro" fallbackIcon={Zap} {...props} />
);

export const PhotonIcon = (props: any) => (
  <ProtocolLogo protocolId="photon" protocolName="Photon" fallbackIcon={BarChart2} {...props} />
);

export const BullXIcon = (props: any) => (
  <ProtocolLogo protocolId="bullx" protocolName="Bull X" fallbackIcon={TrendingUp} {...props} />
);

export const AxiomIcon = (props: any) => (
  <ProtocolLogo protocolId="axiom" protocolName="Axiom" fallbackIcon={Aperture} {...props} />
);

export const GMGNAIIcon = (props: any) => (
  <ProtocolLogo protocolId="gmgnai" protocolName="GMGN AI" fallbackIcon={CalendarClock} {...props} />
);

export const MoonshotIcon = (props: any) => (
  <ProtocolLogo protocolId="moonshot" protocolName="Moonshot" fallbackIcon={Moon} {...props} />
);

export const VectorIcon = (props: any) => (
  <ProtocolLogo protocolId="vector" protocolName="Vector" fallbackIcon={ArrowUpRight} {...props} />
);

export const SlingshotIcon = (props: any) => (
  <ProtocolLogo protocolId="slingshot" protocolName="Slingshot" fallbackIcon={Crosshair} {...props} />
);

export const FomoIcon = (props: any) => (
  <ProtocolLogo protocolId="fomo" protocolName="Fomo" fallbackIcon={BotMessageSquare} {...props} />
);

export const PadreIcon = (props: any) => (
  <ProtocolLogo protocolId="padre" protocolName="Padre" fallbackIcon={Cross} {...props} />
);