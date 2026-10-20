import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export default function NotFoundPage({ message = 'This page could not be found.' }: { message?: string }) {
  return (
    <EmptyState title={message}>
      <Link to="/" className="btn-primary mt-3">
        Go to Family Overview
      </Link>
    </EmptyState>
  );
}
