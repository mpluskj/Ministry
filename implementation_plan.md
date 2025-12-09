# Dashboard Optimization Implementation Plan

## Goal
Optimize the loading speed of the Manager Dashboard by fetching pre-calculated data from the '집계' (Aggregate) sheet instead of calculating it on-the-fly from individual monthly sheets.

## User Review Required
> [!IMPORTANT]
> **'집계' (Aggregate) Sheet Structure Assumption**:
> This plan assumes the '집계' sheet exists and contains columns that map to the dashboard statistics.
> Please confirm the column order or if the headers match the following fields:
> *   Month (월)
> *   Total Reporters (총 보고자)
> *   Total Bible Studies (총 성서연구)
> *   Publisher Count (전도인 수)
> *   Publisher Studies (전도인 연구)
> *   AP Count (보조 파이오니아 수)
> *   AP Hours (보조 파이오니아 시간)
> *   AP Studies (보조 파이오니아 연구)
> *   RP Count (정규 파이오니아 수)
> *   RP Hours (정규 파이오니아 시간)
> *   RP Studies (정규 파이오니아 연구)
>
> If the structure is different, please let me know or I'll add logic to map by header names.

## Proposed Changes

### Backend (Google Apps Script)
#### [MODIFY] [code.gs](file:///e:/Github/Ministry/code.gs)
- Add `getAggregateData(sheet, email)` function.
    - Check if '집계' sheet exists.
    - Read all data from '집계' sheet.
    - If the user is a **Group Manager**, we might need to filter.
        - *Question*: Does the 'Aggregate' sheet contain group-specific data?
        - *Assumption*: For now, I will implement it to return the global data. If group filtering is needed, the current 'Aggregate' sheet might not support it unless it has group columns. *However, usually dashboards for generic managers show overall stats, or maybe the user implies the 'Aggregate' sheet has what they need.*
        - I will add logic to return the raw data from '집계' sheet mapped to `MonthlyStats` objects.
- Update `doGet` to handle `action=aggregateData`.

### Frontend
#### [MODIFY] [clientService.ts](file:///e:/Github/Ministry/src/services/clientService.ts)
- Add `getAggregateData(email: string)` function to call the new API endpoint.

#### [MODIFY] [ManagerDashboard.tsx](file:///e:/Github/Ministry/src/components/ManagerDashboard.tsx)
- Modify `loadData` function:
    - Call `getAggregateData` instead of looping through `getMonthlyStats` for each month.
    - Map the response to the `reports` state.
    - This will significantly reduce the number of network requests from ~12 to 1.

## Verification Plan

### Manual Verification
1.  **Dashboard Load Time**: Open the Manager Dashboard and observe the loading time. It should be much faster.
2.  **Data Accuracy**: Compare the displayed stats with the values in the '집계' sheet.
3.  **Status Toggle**: Check if "Complete/Input" button still works (might need to fetch status separately or assuming Aggregate sheet has it).
    - *Note*: If 'Aggregate' sheet doesn't track "Closed/Open" status, we might need a separate lightweight call to check status, or include it in Aggregate sheet.
    - *Proposal*: I will assume 'Aggregate' sheet might NOT have the status M1 cell data from monthly sheets.
    - *Refined Plan*: `getAggregateData` will *also* quickly iterate through monthly sheets just to get the M1 (Status) cell, or we accept that status might need a separate fetch.
    - *Better approach*: The `getAggregateData` script function can internally open each month sheet just to read one cell (M1), which is fast, or we can trust the 'Aggregate' sheet if it has a status column.
    - *Decision*: I will make `getAggregateData` return the stats from 'Aggregate' sheet AND read the M1 cell from each month sheet to get the status. This is still 1 network request vs 12.

### Automated Tests
- None (Reliance on manual verification as this involves Google Apps Script interaction).
