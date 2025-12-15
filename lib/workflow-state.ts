// lib/workflow-state.ts
// Workflow state management utilities for interactive employee workflow

export type StepStatus = 'completed' | 'active' | 'locked' | 'pending';

export interface WorkflowStep {
  id: string;
  stepNumber: number;
  title: string;
  description?: string;
  status: StepStatus;
  lockedReason?: string;
  isJobSpecific?: boolean;
  jobId?: string;
}

export interface WorkflowState {
  shiftSteps: {
    clockIn: StepStatus;
    viewJobs: StepStatus;
  };
  jobSteps: Record<string, {
    startJob: StepStatus;
    uploadPhotos: StepStatus;
    completeJob: StepStatus;
  }>;
  activeJobId: string | null;
  currentStep: WorkflowStep | null;
}

export interface Prerequisites {
  isClockedIn: boolean;
  hasJobs: boolean;
  selectedJob: {
    id: string;
    status: 'pending' | 'in_progress' | 'completed';
    hasInsidePhoto: boolean;
    hasOutsidePhoto: boolean;
    hasStickerStatus: boolean;
  } | null;
}

/**
 * Calculate workflow progress
 */
export function calculateProgress(
  shiftSteps: WorkflowState['shiftSteps'],
  jobSteps: WorkflowState['jobSteps'],
  activeJobId: string | null
): {
  currentStep: number;
  totalSteps: number;
  completedSteps: number;
  percentage: number;
} {
  const totalSteps = 2 + (activeJobId ? 3 : 0); // 2 shift steps + 3 job steps if job selected
  
  let completedSteps = 0;
  let currentStep = 1;

  // Shift steps
  if (shiftSteps.clockIn === 'completed') {
    completedSteps++;
    currentStep = 2;
  } else {
    return { currentStep: 1, totalSteps, completedSteps, percentage: 0 };
  }

  if (shiftSteps.viewJobs === 'completed') {
    completedSteps++;
    currentStep = 3;
  } else if (shiftSteps.viewJobs === 'active') {
    return { currentStep: 2, totalSteps, completedSteps, percentage: Math.round((completedSteps / totalSteps) * 100) };
  }

  // Job steps
  if (activeJobId && jobSteps[activeJobId]) {
    const steps = jobSteps[activeJobId];
    
    if (steps.startJob === 'completed') {
      completedSteps++;
      currentStep = 4;
    } else if (steps.startJob === 'active') {
      return { currentStep: 3, totalSteps, completedSteps, percentage: Math.round((completedSteps / totalSteps) * 100) };
    }

    if (steps.uploadPhotos === 'completed') {
      completedSteps++;
      currentStep = 5;
    } else if (steps.uploadPhotos === 'active') {
      return { currentStep: 4, totalSteps, completedSteps, percentage: Math.round((completedSteps / totalSteps) * 100) };
    }

    if (steps.completeJob === 'completed') {
      completedSteps++;
      currentStep = 6;
    } else if (steps.completeJob === 'active') {
      return { currentStep: 5, totalSteps, completedSteps, percentage: Math.round((completedSteps / totalSteps) * 100) };
    }
  }

  const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  return { currentStep, totalSteps, completedSteps, percentage };
}

/**
 * Determine step status based on prerequisites and current state
 */
export function getStepStatus(
  stepId: string,
  prerequisites: Prerequisites
): StepStatus {
  switch (stepId) {
    case 'clockIn':
      return prerequisites.isClockedIn ? 'completed' : 'active';

    case 'viewJobs':
      if (!prerequisites.isClockedIn) return 'locked';
      if (!prerequisites.hasJobs) return 'pending';
      return 'active';

    case 'startJob':
      if (!prerequisites.isClockedIn) return 'locked';
      if (!prerequisites.selectedJob) return 'locked';
      if (prerequisites.selectedJob.status === 'completed') return 'completed';
      if (prerequisites.selectedJob.status === 'in_progress') return 'completed';
      return 'active';

    case 'uploadPhotos':
      if (!prerequisites.isClockedIn) return 'locked';
      if (!prerequisites.selectedJob) return 'locked';
      if (prerequisites.selectedJob.status === 'pending') return 'locked';
      if (prerequisites.selectedJob.status === 'completed') return 'completed';
      if (prerequisites.selectedJob.hasInsidePhoto && prerequisites.selectedJob.hasOutsidePhoto) {
        return 'completed';
      }
      return 'active';

    case 'completeJob':
      if (!prerequisites.isClockedIn) return 'locked';
      if (!prerequisites.selectedJob) return 'locked';
      if (prerequisites.selectedJob.status === 'completed') return 'completed';
      if (prerequisites.selectedJob.status === 'pending') return 'locked';
      if (!prerequisites.selectedJob.hasInsidePhoto || !prerequisites.selectedJob.hasOutsidePhoto) {
        return 'locked';
      }
      if (!prerequisites.selectedJob.hasStickerStatus) return 'locked';
      return 'active';

    default:
      return 'pending';
  }
}

/**
 * Get locked reason for a step
 */
export function getLockedReason(stepId: string, prerequisites: Prerequisites): string | undefined {
  switch (stepId) {
    case 'viewJobs':
      if (!prerequisites.isClockedIn) return 'Clock in first to view jobs';
      if (!prerequisites.hasJobs) return 'No jobs assigned';
      return undefined;

    case 'startJob':
      if (!prerequisites.isClockedIn) return 'Clock in first';
      if (!prerequisites.selectedJob) return 'Select a job first';
      return undefined;

    case 'uploadPhotos':
      if (!prerequisites.isClockedIn) return 'Clock in first';
      if (!prerequisites.selectedJob) return 'Select a job first';
      if (prerequisites.selectedJob.status === 'pending') return 'Start the job first';
      return undefined;

    case 'completeJob':
      if (!prerequisites.isClockedIn) return 'Clock in first';
      if (!prerequisites.selectedJob) return 'Select a job first';
      if (prerequisites.selectedJob.status === 'pending') return 'Start the job first';
      if (!prerequisites.selectedJob.hasInsidePhoto || !prerequisites.selectedJob.hasOutsidePhoto) {
        return 'Upload both inside and outside photos';
      }
      if (!prerequisites.selectedJob.hasStickerStatus) return 'Select sticker status';
      return undefined;

    default:
      return undefined;
  }
}

/**
 * Build workflow state from current app state
 */
export function buildWorkflowState(
  isClockedIn: boolean,
  jobs: Array<{ id: string; jobStatus?: 'pending' | 'in_progress' | 'completed'; hasRequiredPhotos?: boolean; insidePhotoUrl?: string; outsidePhotoUrl?: string }>,
  activeJobId: string | null,
  selectedJob: { id: string; jobStatus?: 'pending' | 'in_progress' | 'completed'; hasRequiredPhotos?: boolean; insidePhotoUrl?: string; outsidePhotoUrl?: string; stickerStatus?: string } | null
): WorkflowState {
  const prerequisites: Prerequisites = {
    isClockedIn,
    hasJobs: jobs.length > 0,
    selectedJob: selectedJob ? {
      id: selectedJob.id,
      status: selectedJob.jobStatus || 'pending',
      hasInsidePhoto: !!(selectedJob.insidePhotoUrl || selectedJob.hasRequiredPhotos),
      hasOutsidePhoto: !!(selectedJob.outsidePhotoUrl || selectedJob.hasRequiredPhotos),
      hasStickerStatus: !!selectedJob.stickerStatus && selectedJob.stickerStatus !== 'none',
    } : null,
  };

  const shiftSteps = {
    clockIn: getStepStatus('clockIn', prerequisites),
    viewJobs: getStepStatus('viewJobs', prerequisites),
  };

  const jobSteps: Record<string, {
    startJob: StepStatus;
    uploadPhotos: StepStatus;
    completeJob: StepStatus;
  }> = {};

  if (activeJobId && selectedJob) {
    jobSteps[activeJobId] = {
      startJob: getStepStatus('startJob', prerequisites),
      uploadPhotos: getStepStatus('uploadPhotos', prerequisites),
      completeJob: getStepStatus('completeJob', prerequisites),
    };
  }

  // Determine current step
  let currentStep: WorkflowStep | null = null;
  
  if (shiftSteps.clockIn !== 'completed') {
    currentStep = {
      id: 'clockIn',
      stepNumber: 1,
      title: 'Clock In',
      status: shiftSteps.clockIn,
      lockedReason: getLockedReason('clockIn', prerequisites),
    };
  } else if (shiftSteps.viewJobs === 'active' || shiftSteps.viewJobs === 'pending') {
    currentStep = {
      id: 'viewJobs',
      stepNumber: 2,
      title: 'View Jobs',
      status: shiftSteps.viewJobs,
      lockedReason: getLockedReason('viewJobs', prerequisites),
    };
  } else if (activeJobId && jobSteps[activeJobId]) {
    const steps = jobSteps[activeJobId];
    if (steps.startJob === 'active' || steps.startJob === 'locked') {
      currentStep = {
        id: 'startJob',
        stepNumber: 3,
        title: 'Start Job',
        status: steps.startJob,
        isJobSpecific: true,
        jobId: activeJobId,
        lockedReason: getLockedReason('startJob', prerequisites),
      };
    } else if (steps.uploadPhotos === 'active' || steps.uploadPhotos === 'locked') {
      currentStep = {
        id: 'uploadPhotos',
        stepNumber: 4,
        title: 'Upload Photos',
        status: steps.uploadPhotos,
        isJobSpecific: true,
        jobId: activeJobId,
        lockedReason: getLockedReason('uploadPhotos', prerequisites),
      };
    } else if (steps.completeJob === 'active' || steps.completeJob === 'locked') {
      currentStep = {
        id: 'completeJob',
        stepNumber: 5,
        title: 'Complete Job',
        status: steps.completeJob,
        isJobSpecific: true,
        jobId: activeJobId,
        lockedReason: getLockedReason('completeJob', prerequisites),
      };
    }
  }

  return {
    shiftSteps,
    jobSteps,
    activeJobId,
    currentStep,
  };
}
