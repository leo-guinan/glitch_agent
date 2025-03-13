import { MastraDeployer } from '@mastra/core/deployer';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * @typedef {Object} GCPDeployerOptions
 * @property {string} projectId
 * @property {string} zone
 * @property {string} instanceName
 * @property {string} [machineType]
 * @property {string} [serviceAccount]
 * @property {string[]} [tags]
 * @property {string} [startupScript]
 * @property {Object.<string, string>} [metadata]
 */

export class GCPDeployer extends MastraDeployer {
  /**
   * @param {GCPDeployerOptions} options
   */
  constructor(options) {
    super({ name: 'gcp' });
    this.options = {
      machineType: 'e2-micro',
      ...options,
    };
    this.buildDir = '';
  }

  /**
   * @returns {Promise<void>}
   */
  async prepare() {
    console.log('Preparing deployment...');
    this.buildDir = path.join(process.cwd(), '.mastra');
  }

  /**
   * @returns {Promise<void>}
   */
  async bundle() {
    console.log('Bundling application...');
  }

  /**
   * @returns {Promise<void>}
   */
  async writeInstrumentationFile() {
    console.log('Writing instrumentation file...');
  }

  /**
   * @returns {Promise<void>}
   */
  async deploy() {
    console.log('Starting GCP VM deployment...');
    
    // Build the Mastra application
    console.log('Building Mastra application...');
    execSync('mastra build', { stdio: 'inherit' });
    
    // Check if VM already exists
    const vmExists = this.checkIfVMExists();
    
    if (vmExists) {
      await this.updateVM();
    } else {
      await this.createVM();
    }
    
    // Deploy the application to the VM
    await this.deployToVM();
    
    console.log(`Deployment complete. Your application is running at: http://${this.getVMExternalIP()}`);
  }
  
  /**
   * @returns {boolean}
   */
  checkIfVMExists() {
    try {
      const result = execSync(
        `gcloud compute instances describe ${this.options.instanceName} \
        --project=${this.options.projectId} \
        --zone=${this.options.zone} \
        --format="value(name)"`
      ).toString().trim();
      
      return result === this.options.instanceName;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * @returns {Promise<void>}
   */
  async createVM() {
    console.log(`Creating new VM instance: ${this.options.instanceName}...`);
    
    // Create startup script that installs Node.js and sets up the application
    const startupScript = this.options.startupScript || this.generateDefaultStartupScript();
    const startupScriptPath = path.join(this.buildDir, 'startup-script.sh');
    fs.writeFileSync(startupScriptPath, startupScript);
    
    // Build the VM creation command
    let command = `gcloud compute instances create ${this.options.instanceName} \
      --project=${this.options.projectId} \
      --zone=${this.options.zone} \
      --machine-type=${this.options.machineType} \
      --network-interface=network-tier=PREMIUM,subnet=default \
      --maintenance-policy=MIGRATE \
      --provisioning-model=STANDARD \
      --scopes=https://www.googleapis.com/auth/cloud-platform \
      --create-disk=auto-delete=yes,boot=yes,device-name=${this.options.instanceName},image=projects/debian-cloud/global/images/debian-11-bullseye-v20220719,mode=rw,size=10,type=pd-balanced \
      --metadata-from-file=startup-script=${startupScriptPath}`;
    
    // Add optional parameters
    if (this.options.serviceAccount) {
      command += ` --service-account=${this.options.serviceAccount}`;
    }
    
    if (this.options.tags && this.options.tags.length > 0) {
      command += ` --tags=${this.options.tags.join(',')}`;
    }
    
    if (this.options.metadata && Object.keys(this.options.metadata).length > 0) {
      const metadataItems = Object.entries(this.options.metadata)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
      command += ` --metadata=${metadataItems}`;
    }
    
    // Create firewall rule to allow HTTP traffic
    try {
      console.log('Creating firewall rule to allow HTTP traffic...');
      execSync(
        `gcloud compute firewall-rules create allow-http-${this.options.instanceName} \
        --project=${this.options.projectId} \
        --direction=INGRESS \
        --priority=1000 \
        --network=default \
        --action=ALLOW \
        --rules=tcp:80,tcp:3000 \
        --source-ranges=0.0.0.0/0 \
        --target-tags=http-server`,
        { stdio: 'inherit' }
      );
    } catch (error) {
      console.log('Firewall rule may already exist, continuing...');
    }
    
    // Execute the command
    execSync(command, { stdio: 'inherit' });
    
    console.log('Waiting for VM to initialize...');
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for 1 minute
  }
  
  /**
   * @returns {Promise<void>}
   */
  async updateVM() {
    console.log(`Updating VM instance: ${this.options.instanceName}...`);
    
    // Reset the VM to ensure a clean state
    execSync(
      `gcloud compute instances reset ${this.options.instanceName} \
      --project=${this.options.projectId} \
      --zone=${this.options.zone}`,
      { stdio: 'inherit' }
    );
    
    console.log('Waiting for VM to restart...');
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait for 30 seconds
  }
  
  /**
   * @returns {Promise<void>}
   */
  async deployToVM() {
    console.log('Deploying application to VM...');
    
    // Create a tarball of the build directory
    const tarballPath = path.join(this.buildDir, 'app.tar.gz');
    execSync(
      `tar -czf ${tarballPath} -C ${this.buildDir} .`,
      { stdio: 'inherit' }
    );
    
    // Copy the tarball to the VM
    execSync(
      `gcloud compute scp ${tarballPath} \
      ${this.options.instanceName}:~/app.tar.gz \
      --project=${this.options.projectId} \
      --zone=${this.options.zone}`,
      { stdio: 'inherit' }
    );
    
    // Extract and run the application on the VM
    execSync(
      `gcloud compute ssh ${this.options.instanceName} \
      --project=${this.options.projectId} \
      --zone=${this.options.zone} \
      --command="mkdir -p ~/app && tar -xzf ~/app.tar.gz -C ~/app && cd ~/app && npm install && pm2 restart app || pm2 start .mastra/index.js --name app"`,
      { stdio: 'inherit' }
    );
  }
  
  /**
   * @returns {string}
   */
  getVMExternalIP() {
    const ip = execSync(
      `gcloud compute instances describe ${this.options.instanceName} \
      --project=${this.options.projectId} \
      --zone=${this.options.zone} \
      --format="value(networkInterfaces[0].accessConfigs[0].natIP)"`
    ).toString().trim();
    
    return ip;
  }
  
  /**
   * @returns {string}
   */
  generateDefaultStartupScript() {
    return `#!/bin/bash
# Update and install dependencies
apt-get update
apt-get install -y curl git

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Create app directory
mkdir -p /opt/mastra-app

# Setup PM2 to start on boot
pm2 startup systemd -u root
systemctl enable pm2-root

# Create a simple health check endpoint
cat > /opt/mastra-app/health.js << 'EOL'
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Healthy');
});
server.listen(8080);
EOL

# Start health check server
pm2 start /opt/mastra-app/health.js --name health
pm2 save`;
  }

  /**
   * @returns {Promise<Map<string, string>>}
   */
  async loadEnvVars() {
    console.log('Loading environment variables...');
    const envVars = new Map();
    // Add your environment variables here
    return envVars;
  }

  /**
   * @returns {Promise<string[]>}
   */
  async getEnvFiles() {
    return ['.env'];
  }

  /**
   * @returns {Promise<void>}
   */
  async writePackageJson() {
    console.log('Writing package.json...');
  }
} 