/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as schoolNotification } from './school-request-notification.tsx'
import { template as schoolConfirmation } from './school-request-confirmation.tsx'
import { template as subjectChangeSubmitted } from './subject-change-submitted.tsx'
import { template as subjectChangeApproved } from './subject-change-approved.tsx'
import { template as subjectChangeRejected } from './subject-change-rejected.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'school-request-notification': schoolNotification,
  'school-request-confirmation': schoolConfirmation,
  'subject-change-submitted': subjectChangeSubmitted,
  'subject-change-approved': subjectChangeApproved,
  'subject-change-rejected': subjectChangeRejected,
}
