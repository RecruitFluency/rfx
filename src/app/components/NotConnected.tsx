
import { Link } from 'react-router-dom';
import { DatabaseZap, ArrowRight } from 'lucide-react';
import { Card } from './ui';

export default function NotConnected({ feature }: { feature: string }) {
  return (
    <Card className="p-10 max-w-2xl mx-auto text-center mt-10">
      <DatabaseZap className="w-10 h-10 text-[#FF0000] mx-auto mb-4" />
      <h2 className="text-xl font-semibold mb-2">Connect your database to use {feature}</h2>
      <p className="text-gray-400 text-sm mb-6">
        The app isn't pointed at a live database yet. Setup takes about five minutes and only has to be done once.
      </p>
      <Link
        to="/app/setup"
        className="inline-flex items-center gap-2 bg-[#FF0000] hover:bg-[#CC0000] text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
      >
        Open setup guide <ArrowRight className="w-4 h-4" />
      </Link>
    </Card>
  );
}
