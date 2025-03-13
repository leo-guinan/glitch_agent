#!/bin/bash

# Mastra GCP Deployment Script
# This script prepares and deploys a Mastra application to Google Cloud Platform VM

# Exit on any error
set -e

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-"your-gcp-project-id"}
ZONE=${GCP_ZONE:-"us-central1-a"}
INSTANCE_NAME=${GCP_INSTANCE_NAME:-"mastra-app"}
MACHINE_TYPE=${GCP_MACHINE_TYPE:-"e2-micro"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check for gcloud CLI
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Google Cloud SDK (gcloud) is not installed.${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if logged in to gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo -e "${YELLOW}You are not logged in to gcloud.${NC}"
    echo "Please login using: gcloud auth login"
    exit 1
fi

# Check if project exists and is accessible
if ! gcloud projects describe "$PROJECT_ID" &> /dev/null; then
    echo -e "${RED}Project $PROJECT_ID does not exist or you don't have access to it.${NC}"
    echo "Please check your project ID or permissions."
    exit 1
fi

# Set the current project
gcloud config set project "$PROJECT_ID"

# Check for required APIs and enable them if necessary
REQUIRED_APIS=("compute.googleapis.com" "iam.googleapis.com")

for api in "${REQUIRED_APIS[@]}"; do
    if ! gcloud services list --enabled --filter="name:$api" | grep -q "$api"; then
        echo -e "${YELLOW}Enabling $api...${NC}"
        gcloud services enable "$api"
    fi
done

# Build the Mastra application
echo -e "${GREEN}Building Mastra application...${NC}"
npx mastra build

# Check if VM exists
if gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" &> /dev/null; then
    echo -e "${YELLOW}VM instance $INSTANCE_NAME already exists.${NC}"
    
    # Ask user if they want to redeploy
    read -p "Do you want to redeploy to the existing VM? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deployment canceled.${NC}"
        exit 0
    fi
    
    # Stop the VM for clean deployment
    echo -e "${YELLOW}Stopping VM instance...${NC}"
    gcloud compute instances stop "$INSTANCE_NAME" --zone="$ZONE"
else
    # Create a new VM
    echo -e "${GREEN}Creating new VM instance $INSTANCE_NAME...${NC}"
    
    # Create startup script file
    cat > ./startup-script.sh << 'EOL'
#!/bin/bash
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
EOL
    
    # Create the VM
    gcloud compute instances create "$INSTANCE_NAME" \
        --zone="$ZONE" \
        --machine-type="$MACHINE_TYPE" \
        --network-interface=network-tier=PREMIUM,subnet=default \
        --maintenance-policy=MIGRATE \
        --provisioning-model=STANDARD \
        --scopes=https://www.googleapis.com/auth/cloud-platform \
        --tags=http-server,https-server,mastra-app \
        --create-disk=auto-delete=yes,boot=yes,device-name="$INSTANCE_NAME",image=projects/debian-cloud/global/images/debian-11-bullseye-v20220719,mode=rw,size=10,type=pd-balanced \
        --metadata=enable-oslogin=false \
        --metadata-from-file=startup-script=./startup-script.sh
    
    # Create firewall rule to allow HTTP traffic if it doesn't exist
    if ! gcloud compute firewall-rules describe allow-http-mastra &> /dev/null; then
        echo -e "${GREEN}Creating firewall rule to allow HTTP traffic...${NC}"
        gcloud compute firewall-rules create allow-http-mastra \
            --direction=INGRESS \
            --priority=1000 \
            --network=default \
            --action=ALLOW \
            --rules=tcp:80,tcp:3000 \
            --source-ranges=0.0.0.0/0 \
            --target-tags=http-server
    fi
fi

# Wait for VM to be ready
echo -e "${YELLOW}Waiting for VM to be ready...${NC}"
gcloud compute instances start "$INSTANCE_NAME" --zone="$ZONE" &> /dev/null
sleep 30  # Wait for VM to boot

# Create a tarball of the build directory
echo -e "${GREEN}Packaging application...${NC}"
tar -czf app.tar.gz -C .mastra .

# Copy the application to the VM
echo -e "${GREEN}Copying application to VM...${NC}"
gcloud compute scp app.tar.gz "$INSTANCE_NAME":~/app.tar.gz --zone="$ZONE"

# Deploy and run the application
echo -e "${GREEN}Deploying application...${NC}"
gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="
mkdir -p ~/app
tar -xzf ~/app.tar.gz -C ~/app
cd ~/app
npm install
pm2 start index.js --name mastra-app || pm2 restart mastra-app
pm2 save
"

# Get the external IP
EXTERNAL_IP=$(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --format="value(networkInterfaces[0].accessConfigs[0].natIP)")

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "Your Mastra application is running at: ${GREEN}http://$EXTERNAL_IP:3000${NC}"

# Clean up
rm -f app.tar.gz
rm -f startup-script.sh