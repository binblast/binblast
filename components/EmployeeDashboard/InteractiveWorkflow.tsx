// components/EmployeeDashboard/InteractiveWorkflow.tsx
// Interactive, state-driven workflow component for employee field operations

"use client";

import { useEffect, useRef, useMemo } from "react";
import { buildWorkflowState, calculateProgress, StepStatus } from "@/lib/workflow-state";

interface Job {
  id: string;
  customerName?: string;
  userEmail?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  binCount?: number;
  planType?: string;
  notes?: string;
  jobStatus?: "pending" | "in_progress" | "completed";
  flags?: string[];
  completionPhotoUrl?: string;
  employeeNotes?: string;
  completedAt?: any;
  hasRequiredPhotos?: boolean;
  insidePhotoUrl?: string;
  outsidePhotoUrl?: string;
  stickerStatus?: "existing" | "placed" | "none";
}

interface JobCompletionData {
  completionPhotoUrl?: string;
  insidePhotoUrl?: string;
  outsidePhotoUrl?: string;
  employeeNotes?: string;
  binCount?: number;
  stickerStatus?: "existing" | "placed" | "none";
  stickerPlaced?: boolean;
}

interface InteractiveWorkflowProps {
  isClockedIn: boolean;
  jobs: Job[];
  activeJob: Job | null;
  onClockIn: () => void;
  onJobClick: (job: Job) => void;
  onStartJob: (jobId: string) => Promise<void>;
  onCompleteJob: (jobId: string, data: JobCompletionData) => Promise<void>;
  employeeId: string;
  onWorkflowStepClick?: (stepId: string, jobId?: string) => void;
}

export function InteractiveWorkflow({
  isClockedIn,
  jobs,
  activeJob,
  onClockIn,
  onJobClick,
  onStartJob,
  onCompleteJob,
  employeeId,
  onWorkflowStepClick,
}: InteractiveWorkflowProps) {
  // Rebuild workflow state whenever props change (memoized for performance)
  const workflowState = useMemo(() => {
    return buildWorkflowState(
      isClockedIn,
      jobs,
      activeJob?.id || null,
      activeJob || null
    );
  }, [isClockedIn, jobs, activeJob]);

  const progress = useMemo(() => {
    return calculateProgress(
      workflowState.shiftSteps,
      workflowState.jobSteps,
      workflowState.activeJobId
    );
  }, [workflowState]);

  const jobListRef = useRef<HTMLDivElement>(null);

  // Auto-select first pending job if no active job selected
  useEffect(() => {
    if (isClockedIn && jobs.length > 0 && !activeJob) {
      const firstPendingJob = jobs.find(j => j.jobStatus === 'pending' || !j.jobStatus);
      if (firstPendingJob) {
        onJobClick(firstPendingJob);
      }
    }
  }, [isClockedIn, jobs, activeJob, onJobClick]);

  const handleStepClick = (stepId: string, jobId?: string) => {
    if (onWorkflowStepClick) {
      onWorkflowStepClick(stepId, jobId);
      return;
    }

    switch (stepId) {
      case 'clockIn':
        if (!isClockedIn) {
          onClockIn();
        }
        break;

      case 'viewJobs':
        // Scroll to job list
        if (jobListRef.current) {
          jobListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        // Highlight first pending job
        const firstPendingJob = jobs.find(j => j.jobStatus === 'pending' || !j.jobStatus);
        if (firstPendingJob) {
          setTimeout(() => onJobClick(firstPendingJob), 300);
        }
        break;

      case 'startJob':
        if (jobId && activeJob && activeJob.jobStatus === 'pending') {
          onStartJob(jobId);
        }
        break;

      case 'uploadPhotos':
        if (jobId && activeJob) {
          onJobClick(activeJob);
          // JobDetailModal will handle focusing on photo section
        }
        break;

      case 'completeJob':
        if (jobId && activeJob) {
          onJobClick(activeJob);
          // JobDetailModal will handle focusing on completion section
        }
        break;
    }
  };

  const getStepIcon = (status: StepStatus, stepNumber: number): string => {
    if (status === 'completed') return '✓';
    if (status === 'active') return String(stepNumber);
    if (status === 'locked') return '🔒';
    return String(stepNumber);
  };

  const getStepColors = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return {
          bg: '#d1fae5',
          text: '#065f46',
          border: '#86efac',
          iconBg: '#16a34a',
          iconText: '#ffffff',
        };
      case 'active':
        return {
          bg: '#dbeafe',
          text: '#1e40af',
          border: '#93c5fd',
          iconBg: '#2563eb',
          iconText: '#ffffff',
        };
      case 'locked':
        return {
          bg: '#f3f4f6',
          text: '#6b7280',
          border: '#e5e7eb',
          iconBg: '#9ca3af',
          iconText: '#ffffff',
        };
      default: // pending
        return {
          bg: '#f9fafb',
          text: '#6b7280',
          border: '#e5e7eb',
          iconBg: '#9ca3af',
          iconText: '#ffffff',
        };
    }
  };

  const renderStep = (
    stepId: string,
    stepNumber: number,
    title: string,
    description: string,
    status: StepStatus,
    lockedReason?: string,
    isJobSpecific = false,
    jobName?: string
  ) => {
    const colors = getStepColors(status);
    const icon = getStepIcon(status, stepNumber);
    const isClickable = status === 'active' || status === 'pending';
    const isDisabled = status === 'locked';

    return (
      <button
        key={stepId}
        onClick={() => {
          if (isClickable && !isDisabled) {
            handleStepClick(stepId, activeJob?.id);
          }
        }}
        disabled={isDisabled}
        style={{
          width: '100%',
          minHeight: '64px',
          padding: '1rem',
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          cursor: isClickable && !isDisabled ? 'pointer' : 'not-allowed',
          opacity: isDisabled ? 0.6 : 1,
          transition: 'all 0.2s',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => {
          if (isClickable && !isDisabled) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        title={isDisabled ? lockedReason : description}
      >
        {/* Step Icon */}
        <div
          style={{
            width: '48px',
            height: '48px',
            minWidth: '48px',
            borderRadius: '50%',
            background: colors.iconBg,
            color: colors.iconText,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '1.25rem',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        {/* Step Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: colors.text,
              marginBottom: '0.25rem',
            }}
          >
            {title}
            {isJobSpecific && jobName && (
              <span style={{ fontSize: '0.875rem', fontWeight: '500', marginLeft: '0.5rem' }}>
                ({jobName})
              </span>
            )}
          </div>
          {description && (
            <div
              style={{
                fontSize: '0.75rem',
                color: colors.text,
                opacity: 0.8,
              }}
            >
              {description}
            </div>
          )}
          {isDisabled && lockedReason && (
            <div
              style={{
                fontSize: '0.75rem',
                color: '#dc2626',
                marginTop: '0.25rem',
                fontWeight: '500',
              }}
            >
              {lockedReason}
            </div>
          )}
        </div>

        {/* Status Indicator */}
        {status === 'active' && (
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#2563eb',
              animation: 'pulse 2s infinite',
            }}
          />
        )}
      </button>
    );
  };

  // Don't show workflow if not clocked in (clock in is handled by TodayStatusBar)
  if (!isClockedIn) {
    return null;
  }

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      }}
    >
      {/* Progress Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#111827',
          }}
        >
          Your Workflow
        </div>
        <div
          style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#6b7280',
          }}
        >
          Step {progress.currentStep} of {progress.totalSteps}
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '8px',
          background: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            width: `${progress.percentage}%`,
            height: '100%',
            background: '#16a34a',
            transition: 'width 0.3s',
          }}
        />
      </div>

      {/* Workflow Steps */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {/* Step 1: Clock In */}
        {renderStep(
          'clockIn',
          1,
          'Clock In',
          'Start your shift',
          workflowState.shiftSteps.clockIn,
          undefined,
          false
        )}

        {/* Step 2: View Jobs */}
        {renderStep(
          'viewJobs',
          2,
          'View Jobs',
          'See your assigned jobs',
          workflowState.shiftSteps.viewJobs,
          workflowState.currentStep?.id === 'viewJobs' ? workflowState.currentStep.lockedReason : undefined,
          false
        )}

        {/* Job-Specific Steps */}
        {activeJob && workflowState.jobSteps[activeJob.id] && (
          <>
            {renderStep(
              'startJob',
              3,
              'Start Job',
              `Begin work on ${activeJob.customerName || activeJob.userEmail || 'this job'}`,
              workflowState.jobSteps[activeJob.id].startJob,
              workflowState.currentStep?.id === 'startJob' ? workflowState.currentStep.lockedReason : undefined,
              true,
              activeJob.customerName || activeJob.userEmail || undefined
            )}

            {renderStep(
              'uploadPhotos',
              4,
              'Upload Photos',
              'Take inside and outside photos',
              workflowState.jobSteps[activeJob.id].uploadPhotos,
              workflowState.currentStep?.id === 'uploadPhotos' ? workflowState.currentStep.lockedReason : undefined,
              true,
              activeJob.customerName || activeJob.userEmail || undefined
            )}

            {renderStep(
              'completeJob',
              5,
              'Complete Job',
              'Submit job with all requirements',
              workflowState.jobSteps[activeJob.id].completeJob,
              workflowState.currentStep?.id === 'completeJob' ? workflowState.currentStep.lockedReason : undefined,
              true,
              activeJob.customerName || activeJob.userEmail || undefined
            )}
          </>
        )}

        {/* No Job Selected Message */}
        {!activeJob && workflowState.shiftSteps.viewJobs === 'completed' && (
          <div
            style={{
              padding: '1rem',
              background: '#f3f4f6',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: '#6b7280',
            }}
          >
            Select a job to continue workflow
          </div>
        )}
      </div>

      {/* Hidden ref for job list scrolling */}
      <div ref={jobListRef} style={{ position: 'absolute', top: 0 }} />

      {/* CSS Animation for pulse effect */}
      <style jsx>{`
        @keyframes workflowPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(37, 99, 235, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
          }
        }
      `}</style>
    </div>
  );
}
