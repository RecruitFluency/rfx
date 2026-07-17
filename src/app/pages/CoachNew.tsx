import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { isConfigured } from '../../lib/supabase';
import { createCoach } from '../../lib/api';
import { Card, PageHeader } from '../components/ui';
import CoachForm from '../components/CoachForm';
import NotConnected from '../components/NotConnected';

export default function CoachNew() {
  const navigate = useNavigate();

  if (!isConfigured) return <NotConnected feature="adding coaches" />;

  return (
    <div>
      <Link to="/app/coaches" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white mb-4">
        <ArrowLeft className="w-4 h-4" /> Coach Directory
      </Link>
      <PageHeader
        title="Add a coach"
        subtitle="For contacts you learn about between vendor files. They get a generated RFX ID, so a future vendor row for the same person (with its own ID) will be flagged as an identity conflict for you to merge."
      />
      <Card className="p-6 max-w-3xl">
        <div className="flex items-center gap-2 font-semibold mb-4">
          <UserPlus className="w-4 h-4 text-[#FF0000]" /> New coach
        </div>
        <CoachForm
          submitLabel="Add coach"
          onSubmit={async (draft) => {
            const coach = await createCoach(draft);
            navigate(`/app/coaches/${coach.id}`);
          }}
          onCancel={() => navigate('/app/coaches')}
        />
      </Card>
    </div>
  );
}
