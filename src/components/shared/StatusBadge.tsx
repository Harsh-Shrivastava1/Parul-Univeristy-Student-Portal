import React from 'react';
import type { ApplicationStatus } from '../../types';

// One entry per canonical ApplicationStatus value (matches the backend workflow).
const config: Record<ApplicationStatus, { label: string; className: string }> = {
  Applied: {
    label: 'Applied',
    className: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  },
  'Under Review': {
    label: 'Under Review',
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  'Interview Scheduled': {
    label: 'Interview Scheduled',
    className: 'bg-purple-50 text-purple-700 border border-purple-200',
  },
  'Interview Completed': {
    label: 'Interview Completed',
    className: 'bg-purple-100 text-purple-800 border border-purple-300',
  },
  Selected: {
    label: 'Selected',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  'Assigned to Respective Cell': {
    label: 'Assigned to Cell',
    className: 'bg-teal-50 text-teal-700 border border-teal-200',
  },
  'Training Assigned': {
    label: 'Training Assigned',
    className: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  },
  'Training Starts': {
    label: 'Training Starts',
    className: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  },
  'Training Completed': {
    label: 'Training Completed',
    className: 'bg-indigo-100 text-indigo-800 border border-indigo-300',
  },
  'Returned to TEC Cell': {
    label: 'Returned to TEC Cell',
    className: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  'Internship Starts': {
    label: 'Internship Starts',
    className: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  },
  'Internship Completed': {
    label: 'Internship Completed',
    className: 'bg-green-100 text-green-800 border border-green-300',
  },
  'Final Completion': {
    label: 'Final Completion',
    className: 'bg-green-100 text-green-800 border border-green-300',
  },
  Rejected: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700 border border-red-200',
  },
};

interface StatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const { label, className: statusClass } = config[status] ?? {
    label: status,
    className: 'bg-zinc-100 text-zinc-700 border border-zinc-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass} ${className}`}
    >
      {label}
    </span>
  );
};
