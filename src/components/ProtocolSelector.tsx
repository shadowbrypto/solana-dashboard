import { useNavigate, useSearchParams } from 'react-router-dom';
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
              <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20">
                <img 
                  src={`/assets/logos/${getProtocolLogoFilename(protocol.id)}`}
                  alt={protocol.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const container = target.parentElement;
                    if (container) {
                      container.innerHTML = '';
                      container.className = 'w-4 h-4 bg-muted/20 rounded flex items-center justify-center';
                      const iconEl = document.createElement('div');
                      iconEl.innerHTML = '<svg class="h-2 w-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/></svg>';
                      container.appendChild(iconEl);
                    }
                  }}
                />
              </div>
            )}
            {protocol.name}
          </button>
        ))}
      </div>
    </div>
  );
}
