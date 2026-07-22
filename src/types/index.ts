export interface SpiScores {
  sem1?: number;
  sem2?: number;
  sem3?: number;
  sem4?: number;
  sem5?: number;
  sem6?: number;
  sem7?: number;
  sem8?: number;
}

export interface Experience {
  title: string;
  company: string;
  duration: string;
  description: string;
}

export interface User {
  id: string;
  name: string;
  enrollmentNumber: string;
  email: string;
  /** Institute code (e.g. PIET) — locked at signup, Admin-only edit. */
  institute?: string;
  department: string;
  semester: number;
  contact: string;
  address: string;
  cgpa: number;
  avatarUrl?: string;
  spi?: number;
  // Extended fields
  skills?: string[];
  languages?: string[];
  experience?: Experience[];
  backlogs?: number;
  attendance?: number;
  spiScores?: SpiScores;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  gender?: string;
  category?: string;
  instituteId?: string;
}

export interface Internship {
  id: string;
  postName: string;
  department: string;
  stipend: string;
  duration: string;
  skills: string[];
  vacancy: number;
  interviewDate: string;
  interviewTime: string;
  venue: string;
  status: 'Open' | 'Closed';
  tasks: string[];
  otherInfo?: string;
  postedDate: string;
  // Extended fields
  description?: string;
  responsibilities?: string[];
  category?: string;
  minCGPA?: number;
  eligibility?: string;
  contactPerson?: string;
  contactEmail?: string;
}

export type ApplicationStatus =
  | 'Applied'
  | 'Under Review'
  | 'Interview Scheduled'
  | 'Interview Completed'
  | 'Selected'
  | 'Assigned to Respective Cell'
  | 'Training Assigned'
  | 'Training Starts'
  | 'Training Completed'
  | 'Returned to TEC Cell'
  | 'Internship Starts'
  | 'Internship Completed'
  | 'Final Completion'
  | 'Rejected';

export interface ApplicationFormData {
  fullName: string;
  enrollmentNumber: string;
  contact: string;
  email: string;
  presentAddress: string;
  permanentAddress?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  gender?: string;
  category?: string;
  instituteName: string;
  departmentName: string;
  position: string;
  semester: number;
  cgpa: number;
  backlogs: number;
  attendance: number;
  spiScores: SpiScores;
  languagesKnown: string;
  tasksCanPerform: string;
  supportInformation: string;
  reference1Name?: string;
  reference1Designation?: string;
  reference1Contact?: string;
  reference2Name?: string;
  reference2Designation?: string;
  reference2Contact?: string;
  declarationAccepted: boolean;
  digitalSignature: string;
}

export interface Application {
  id: string;
  internshipId: string;
  internship: Internship;
  userId: string;
  appliedDate: string;
  status: ApplicationStatus;
  lastUpdated: string;
  formData?: ApplicationFormData;
  timeline: {
    status: ApplicationStatus;
    timestamp: string;
    notes?: string;
  }[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}

