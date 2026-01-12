import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

export default function NotFound() {
  const [searchParams] = useSearchParams();
  const invalidProtocol = searchParams.get('protocol');

  return (
    <div className="text-center py-12">
      <h1 className="text-4xl font-bold text-white mb-4">404</h1>
      <h2 className="text-2xl text-white/80 mb-6">
        {invalidProtocol 
          ? `Protocol "${invalidProtocol}" not found` 
          : 'Page not found'}
      </h2>
      <p className="text-white/60 mb-8">
        {invalidProtocol 
          ? `The protocol "${invalidProtocol}" is not supported. Please use one of the valid protocols.`
          : 'The page you are looking for does not exist.'}
      </p>
      <div className="flex flex-col gap-4 items-center">
        <div className="bg-[#1E1E2A] p-4 rounded-lg max-w-md">
          <h3 className="text-white font-semibold mb-2">Valid protocols:</h3>
          <ul className="text-white/80 list-disc list-inside text-left">
            <li>bullx - Bull X data</li>
            <li>photon - Photon data</li>
            <li>trojanonsolana - Trojan data</li>
            <li>all - Combined data from all protocols</li>
          </ul>
        </div>
        <Link 
          to="/" 
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
