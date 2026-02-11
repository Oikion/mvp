# Security Documentation Index

## Directory Structure

- `credential-rotation-policy.md` - Rotation schedule, procedures, and verification checklist.
- `rotation-log.md` - Historical log of all credential rotations performed.

## Versioning Details

- Current scope: MVP security policies
- Update cadence: Quarterly review or after security incidents

## Key Usage Notes

- Update `credential-rotation-policy.md` when provider rotation requirements change.
- Record completed rotations in `rotation-log.md` after each rotation.
- The GitHub Actions workflow `.github/workflows/credential-rotation-reminder.yml` automatically creates quarterly reminder issues.
