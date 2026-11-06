import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  return (
    <div className="px-4 py-14">
      <EmptyState
        icon={Compass}
        title="This page doesn’t exist"
        action={<Link to="/" className="btn-primary">Back to home</Link>}
      >
        The link may be out of date.
      </EmptyState>
    </div>
  );
}
