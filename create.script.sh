# #!/bin/bash
# if [ -z "$1" ]; then
#   echo "Usage: $0 <script-name>"
#   echo "Example: $0 template.script.ts"
#   exit 1
# fi

# # Assign the provided script name to a variable
# SCRIPT_NAME="$1"
# # Get the current timestamp for the filename
# timestamp=$(date +"%Y%m%d%H%M%S")

# # Define the filename with dynamic name
# filename="./src/scripts/$SCRIPT_NAME.script.ts"

# # Create the file and populate the content
# cat <<EOL > $filename
# /*
# The script Descripton
# */
# import { NestFactory } from '@nestjs/core';
# import { CloudkModule } from '@/src/cloud-k.module';
# import { License } from '../schema/license.schema';
# import { Model } from 'mongoose';
# import { UserLicenseService } from '../license/user.license.service';

# async function bootstrap() {
#   const appContext = await NestFactory.createApplicationContext(CloudkModule);
#   const licenceModel = appContext.get<Model<License>>(License.name + 'Model');
#   const userLicenseService = appContext.get(UserLicenseService);

#   console.log('script run done');

#   process.exit(0);
# }

# bootstrap().catch((err) => {
#   console.error('Error populating database:', err);
#   process.exit(1);
# });
# EOL

# # Provide feedback
# echo "File $filename created successfully."


#!/bin/bash
if [ -z "$1" ]; then
  echo "Usage: $0 <script-name>"
  echo "Example: $0 template.script.ts"
  exit 1
fi

# Assign the provided script name to a variable
SCRIPT_NAME="$1"
# Get the current timestamp for the filename
timestamp=$(date +"%Y%m%d%H%M%S")

# Define the filename with dynamic name
filename="./src/scripts/$SCRIPT_NAME.script.ts"

# Define the external file you want to include
EXTERNAL_FILE="./src/scripts/template.script.ts"

# Check if the external file exists
if [ ! -f "$EXTERNAL_FILE" ]; then
  echo "Error: External file $EXTERNAL_FILE does not exist."
  exit 1
fi

# Read the content of the external file
EXTERNAL_CONTENT=$(cat "$EXTERNAL_FILE")

# Create the file and populate the content
cat <<EOL > $filename
$EXTERNAL_CONTENT
EOL

# Provide feedback
echo "File $filename created successfully."
