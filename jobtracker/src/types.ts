// src/types.ts
export type ApplicationStatus = 'envoyee' | 'entrevue' | 'refusee' | 'offre';

export interface Application {
  id: string;
  company: string;
  position: string;
  offerLink?: string;
  status: ApplicationStatus;
  date: string; // ISO string ou 'YYYY-MM-DD'
  notes?: string;
}
