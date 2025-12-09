# Dashboard Optimization Walkthrough

## Overview
Improved the loading speed of the Manager Dashboard by fetching pre-calculated data from the '집계' (Aggregate) sheet. This replaces the previous method of making ~12 separate network requests (one for each month).

## Changes

### Backend (Google Apps Script)
#### [code.gs](file:///e:/Github/Ministry/code.gs)
- **New Function**: `getAggregateData(sheet, email)`
    - **Optimization**: Reads directly from 'Aggregate' sheet.
    - **Status Check**: Reads status from Column K (Index 10) of the 'Aggregate' sheet.
- **Updated Function**: `handleToggleStatus(sheet, month)`
    - Toggles status in Column K of the 'Aggregate' sheet instead of the monthly sheet.
- **Removed Function**: `getAllMonthStatuses` (no longer needed).
- **API Endpoint**: `action=aggregateData` handles both data and status.
3.  **Local Test**: Run the React app (`npm run dev`) and check the dashboard loading speed.
    - Result: Frontend loads successfully.
    ![Manager Login Page](manager_login_page_1765206471549.png)
4.  **Data Verification**: Ensure the numbers in the dashboard match the '집계' sheet.

> [!NOTE]
> The 'Aggregate' sheet columns are now mapped as follows (Index 1-9):
> Total Reporters, Publisher Count, Publisher Studies, AP Count, AP Hours, AP Studies, RP Count, RP Hours, RP Studies.
> **Status Column**: Column K (Index 10) is used for Open/Closed status.
> **Total Bible Studies** (총 성서연구) is calculated dynamically: Publisher Studies + AP Studies + RP Studies.
