import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, XCircle, ArrowLeft, Loader2 } from "lucide-react";

export default function ApprovalActionModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  action, 
  claimNumber,
  isLoading 
}) {
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  const actionConfig = {
    approve: {
      title: 'Approve Claim',
      description: `Are you sure you want to approve claim ${claimNumber}?`,
      icon: CheckCircle,
      iconColor: 'text-green-600',
      buttonColor: 'bg-green-600 hover:bg-green-700',
      buttonText: 'Approve',
      remarksRequired: false,
    },
    reject: {
      title: 'Reject Claim',
      description: `This will permanently reject claim ${claimNumber}. Please provide a reason.`,
      icon: XCircle,
      iconColor: 'text-red-600',
      buttonColor: 'bg-red-600 hover:bg-red-700',
      buttonText: 'Reject',
      remarksRequired: true,
    },
    send_back: {
      title: 'Send Back for Correction',
      description: `Send claim ${claimNumber} back to the employee for correction.`,
      icon: ArrowLeft,
      iconColor: 'text-amber-600',
      buttonColor: 'bg-amber-600 hover:bg-amber-700',
      buttonText: 'Send Back',
      remarksRequired: true,
    },
  };

  const config = actionConfig[action] || actionConfig.approve;
  const Icon = config.icon;

  const handleConfirm = () => {
    if (config.remarksRequired && !remarks.trim()) {
      setError('Remarks are required for this action');
      return;
    }
    onConfirm(remarks);
    setRemarks('');
    setError('');
  };

  const handleClose = () => {
    setRemarks('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              action === 'approve' ? 'bg-green-100' :
              action === 'reject' ? 'bg-red-100' : 'bg-amber-100'
            }`}>
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <div>
              <DialogTitle>{config.title}</DialogTitle>
              <DialogDescription className="mt-1">
                {config.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="remarks">
              Remarks {config.remarksRequired && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="remarks"
              placeholder={config.remarksRequired 
                ? "Please provide a reason for this action..." 
                : "Add optional remarks..."}
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value);
                setError('');
              }}
              rows={4}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            className={config.buttonColor}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Icon className="w-4 h-4 mr-2" />
                {config.buttonText}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}