// Example S3 backend configuration - uncomment and edit to enable remote state
// terraform {
//   backend "s3" {
//     bucket = "<your-tfstate-bucket>"
//     key    = "infra/terraform.tfstate"
//     region = "us-east-1"
//   }
// }

// NOTE: For production, always use a remote backend (S3 + DynamoDB lock) and protect state.
