# AttendEase

Smart Attendance. Accurate Payroll.

## Release Setup (GitHub)

This project auto-publishes desktop builds when you push to the `release` branch.

### Required: GH_TOKEN Secret
1. Create a Personal Access Token (classic) with `repo` scope.
2. In your GitHub repo, go to **Settings → Secrets and variables → Actions**.
3. Add a new repository secret:
   - Name: `GH_TOKEN`
   - Value: your token

### How To Publish
Push to the `release` branch. GitHub Actions will run `npm run build:desktop:publish` and create a Release.
