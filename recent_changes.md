# Recent Changes - February 26, 2026

## UI & User Experience (Webapp)
- **Gossip Feed Cleanup**: Removed the redundant "View Profile" button next to the heat score in the desktop dashboard. This streamlines the interface as a profile link already exists on the celebrity image.
- **Settings Tab Optimization**: Improved the scrollable area in the User Settings modal. The scroll bar is now shortened by 15% (10% top margin, 5% bottom margin) to ensure it no longer overlaps with the "Exit" button, providing a cleaner interaction.

## Backend & Worker Logic
- **Precision Deceased Check**: Refined the `isPersonAlive` logic in the worker service. The system now uses advanced Wikipedia parsing (prioritizing "is a/an" over "was a/an") and specific death indicators (e.g., "died in", "(died ") to prevent living celebrities from being incorrectly flagged and skipped during seeding.
- **Weekly Digest Rescheduling**: The automated Weekly Digest for Pro users has been moved from Sunday mornings to **Friday at 02:00 GMT** to better align with the weekend news cycle.

## Infrastructure & Maintenance
- **Clean Build Process**: Erased Next.js build caches and performed a full rebuild of the `webapp` and `worker` Docker containers to ensure all UI and logic changes are live.
- **Source Control**: All changes have been committed and pushed to the main branch on GitHub.
