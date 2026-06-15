export interface WorkspaceConfig {
  id: 'prospectgrid';
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  accent: string;
  initials: string;
}

export const WORKSPACE: WorkspaceConfig = {
  id: 'prospectgrid',
  name: 'ProspectGrid',
  shortName: 'ProspectGrid',
  tagline: 'Lead Intelligence Platform',
  description: 'Source, enrich, score, and route business leads across every marketing channel.',
  accent: '#00CEC8',
  initials: 'PG',
};

export function getWorkspaceConfig(): WorkspaceConfig {
  return WORKSPACE;
}
