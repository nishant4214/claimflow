import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function SubmitClaim() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/claims/new');
  }, [navigate]);

  return null;
}