import { useNavigate, useParams } from 'react-router-dom';
import { Tour, User } from '../../types';
import OrganizerProfile from '../OrganizerProfile';
import NotFoundPage from '../NotFoundPage';

interface OrganizerRouteProps {
  users: User[];
  tours: Tour[];
}

export function OrganizerRoute({ users, tours }: OrganizerRouteProps) {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();

  const organizer = users.find(u => u.id === vendorId);
  if (!organizer) return <NotFoundPage />;

  return (
    <OrganizerProfile
      organizer={organizer}
      tours={tours}
      onBack={() => navigate(-1)}
      onTourClick={(tour) => navigate(`/tours/${tour.slug || tour.id}`)}
    />
  );
}
