import { MastraDeployer } from '@mastra/core/deployer';

export interface GCPDeployerOptions {
  projectId: string;
  zone: string;
  instanceName: string;
  machineType?: string;
  serviceAccount?: string;
  tags?: string[];
  startupScript?: string;
  metadata?: Record<string, string>;
}

export class GCPDeployer extends MastraDeployer {
  constructor(options: GCPDeployerOptions);
  prepare(): Promise<void>;
  bundle(): Promise<void>;
  writeInstrumentationFile(): Promise<void>;
  deploy(): Promise<void>;
  loadEnvVars(): Promise<Map<string, string>>;
  getEnvFiles(): Promise<string[]>;
  writePackageJson(): Promise<void>;
} 