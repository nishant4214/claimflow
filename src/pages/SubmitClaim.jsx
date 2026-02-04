import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import ClaimForm from '../components/forms/ClaimForm';

export default function SubmitClaim() {
  const [user, setUser] = useState(null);
  const [editingClaim, setEditingClaim] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();

    // Check if editing existing claim
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    if (editId) {
      loadClaimForEdit(editId);
    }
  }, []);

  const loadClaimForEdit = async (claimId) => {
    try {
      const claims = await base44.entities.Claim.filter({ id: claimId });
      if (claims.length > 0) {
        setEditingClaim(claims[0]);
      }
    } catch (error) {
      toast.error('Failed to load claim for editing');
    }
  };

  const createClaimMutation = useMutation({
    mutationFn: (claimData) => base44.entities.Claim.create(claimData),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['my-claims']);
      if (data.status === 'draft') {
        toast.success('Claim saved as draft');
      } else {
        toast.success('Claim submitted successfully!');
        // Create notification for first approver
        createNotification(data);
      }
      navigate(createPageUrl('MyClaims'));
    },
    onError: (error) => {
      toast.error('Failed to submit claim. Please try again.');
    }
  });

  const createNotification = async (claim) => {
    await base44.entities.Notification.create({
      recipient_email: claim.created_by,
      claim_id: claim.id,
      claim_number: claim.claim_number,
      notification_type: 'claim_submitted',
      title: 'Claim Submitted Successfully',
      message: `Your claim ${claim.claim_number} for ₹${claim.amount.toLocaleString('en-IN')} has been submitted and is pending approval.`,
    });
  };

  const handleSubmit = (formData) => {
    createClaimMutation.mutate(formData);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" className="mb-4 -ml-2 text-gray-600">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Submit New Claim</h1>
          <p className="text-gray-500 mt-1">
            Complete the form below to submit your expense claim
          </p>
        </div>

        <ClaimForm 
          user={user} 
          onSubmit={handleSubmit}
          isLoading={createClaimMutation.isPending}
        />
      </div>
    </div>
  );
}