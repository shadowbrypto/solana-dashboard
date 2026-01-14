import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProtocolLogo } from './ui/logo-with-fallback';
import { getProtocolLogoFilename } from '../lib/protocol-config';

interface ProtocolSelectorProps {
  currentProtocol: string;
  onProtocolChange: (protocol: string) => void;
}

export function ProtocolSelector({ currentProtocol, onProtocolChange }: ProtocolSelectorProps) {
  const protocols = [
    { id: 'bullx', name: 'Bull X' },
    { id: 'photon', name: 'Photon' },
    { id: 'trojanonsolana', name: 'Trojan On Solana' },
    { id: 'axiom', name: 'Axiom' },
    { id: 'gmgnai', name: 'GmGnAi' },
    { id: 'bloom', name: 'Bloom' },
    { id: 'bonkbot', name: 'BonkBot' },
    { id: 'nova', name: 'Nova' },
    { id: 'soltradingbot', name: 'SolTradingBot' },
    { id: 'maestro', name: 'Maestro' },
    { id: 'banana', name: 'Banana' },
    { id: 'terminal', name: 'Terminal' },
    { id: 'moonshot', name: 'Moonshot' },
    { id: 'vector', name: 'Vector' },
    { id: 'all', name: 'All Trading Apps' }
  ];

  const handleProtocolChange = (protocolId: string) => {
    onProtocolChange(protocolId);
  };

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2">
        {protocols.map((protocol) => (
          <button
            key={protocol.id}
            onClick={() => handleProtocolChange(protocol.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentProtocol === protocol.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {protocol.id !== 'all' && (
              <ProtocolLogo
                src={`/assets/logos/${getProtocolLogoFilename(protocol.id)}`}
                alt={protocol.name}
              />
            )}
            {protocol.name}
          </button>
        ))}
      </div>
    </div>
  );
}
