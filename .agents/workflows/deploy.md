---
description: How to deploy the application to Vercel
---

// turbo-all
# Deployment Workflow

This workflow ensures that the application is consistently deployed to Vercel production to keep mobile devices synchronized.

1. Ensure all changes are saved and committed (if using Git).
2. Run the deployment command:
```bash
npx vercel --prod --yes
```
3. Verify the deployment URL in the output.
4. Notify the user once the deployment is successfully completed.
