export interface WorkspaceConfig {
  id: 'synq';
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  accent: string;
  initials: string;
}

export const WORKSPACE: WorkspaceConfig = {
  id: 'synq',
  name: 'SYNQ',
  shortName: 'SYNQ',
  tagline: 'Lead Intelligence Platform',
  description: 'Source, enrich, score, and route business leads across every marketing channel.',
  accent: '#00CEC8',
  initials: 'SQ',
};

export function getWorkspaceConfig(): WorkspaceConfig {
  return WORKSPACE;
}
