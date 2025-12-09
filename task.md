# Dashboard Optimization with Aggregate Sheet

- [x] Backend: Implement `getAggregateData` in `code.gs` <!-- id: 0 -->
    - [x] Add `getAggregateData` function <!-- id: 1 -->
    - [x] Update `doGet` to handle `action=aggregateData` <!-- id: 2 -->
    - [x] Optimize: Remove individual sheet opening (Status check) <!-- id: 10 -->
    - [x] Update column mapping based on user feedback <!-- id: 11 -->
- [x] Backend: Update `getAggregateData` to read status from Column K <!-- id: 18 -->
- [x] Backend: Update `handleToggleStatus` to write to 'Aggregate' sheet Column K <!-- id: 19 -->
- [x] Backend: Cleanup `getAllMonthStatuses` (no longer needed) <!-- id: 20 -->
- [x] Frontend: Revert async status fetching in `ManagerDashboard.tsx` <!-- id: 21 -->
- [x] Frontend: Optimize Performance <!-- id: 22 -->
    - [x] Configure Vite code splitting (manualChunks) <!-- id: 23 -->
    - [x] Parallelize API calls (Promise.all) in Dashboard <!-- id: 24 -->
- [x] Verify changes <!-- id: 7 -->
    - [x] Check frontend build <!-- id: 8 -->
    - [x] Verify frontend loading <!-- id: 9 -->
