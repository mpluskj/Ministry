import { gapi } from 'gapi-script';

// Global type declarations for Google APIs
declare global {
  namespace gapi.client {
    interface SheetsAPI {
      spreadsheets: {
        values: {
          get(params: {
            spreadsheetId: string;
            range: string;
          }): Promise<{
            result: {
              values?: any[][];
            };
          }>;
          append(params: {
            spreadsheetId: string;
            range: string;
            valueInputOption: string;
            insertDataOption: string;
            requestBody: {
              values: any[][];
            };
          }): Promise<any>;
          update(params: {
            spreadsheetId: string;
            range: string;
            valueInputOption: string;
            requestBody: {
              values: any[][];
            };
          }): Promise<any>;
        };
      };
    }
    const sheets: SheetsAPI;
  }

  interface Window {
    gapi: typeof gapi & {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: { apiKey: string; discoveryDocs: string[] }) => Promise<void>;
        getToken: () => string | null;
      };
    };
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: ((resp: any) => void) | null;
            prompt?: 'none' | 'consent' | 'select_account';
            enable_serial_consent?: boolean;
          }) => TokenClient;
        };
      };
    };
  }
}

interface TokenClient {
  requestAccessToken: () => void;
  callback: ((resp: any) => void) | null;
}

const CLIENT_ID = '497507205467-hic2647a8dbe9im2n68ljcftc5pf3pkv.apps.googleusercontent.com';
const API_KEY = 'AIzaSyBCMOdCd9HJ9_50WeY4CnGKV6KNyOy568w';
const SPREADSHEET_ID = '134CgG8LsC3ifDRZ2VnqhoyP1xWvuGbaDCS9jj9H139Y';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

let tokenClient: TokenClient | null = null;
let gapiInited = false;
let gisInited = false;

export interface MinistryReport {
  name: string;
  month: string;
  participated: boolean;
  bibleStudies: string;
  hours: string;
  remarks?: Array<{
    type: string;
    hours: string;
    etc?: string;
  }>;
}

export const initGoogleAPI = async () => {
  if (gapiInited && gisInited) return true;

  // Load the Google API client library
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });

  await new Promise<void>((resolve) => {
    window.gapi.load('client', {
      callback: resolve,
      onerror: () => {
        console.error('Failed to load GAPI client');
        resolve();
      }
    });
  });

  await window.gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  });

  gapiInited = true;

  // Load the Google Identity Services library
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES.join(' '),
    callback: null,
    prompt: 'consent',
    enable_serial_consent: true
  });

  gisInited = true;
  return true;
};

export const signInIfNeeded = async (): Promise<void> => {
  if (!tokenClient) throw new Error('Token client not initialized');
  
  return new Promise((resolve, reject) => {
    try {
      tokenClient!.callback = (resp) => {
        if (resp.error) reject(resp);
        resolve();
      };
      if (gapi.client.getToken() === null) {
        tokenClient!.requestAccessToken();
      } else {
        resolve();
      }
    } catch (err) {
      reject(err);
    }
  });
};

const getAccessToken = signInIfNeeded;

export const submitReport = async (data: MinistryReport) => {
  await getAccessToken();

  const listResp = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '전체명단!A:F',
  });

  const userRow = listResp.result.values?.find((row: any[]) => row[0] === data.name);
  const position = userRow?.[1] || '';
  const rp = userRow?.[2] || '';
  const group = userRow?.[5] || '';

  const remarksCell = (data.remarks || [])
    .map(r => `${r.type}${r.hours ? ': ' + r.hours + '시간' : ''}${r.etc ? ' - ' + r.etc : ''}`)
    .filter(Boolean)
    .join('\n');

  const values = [
    [
      data.name,
      data.month,
      data.participated ? 'Y' : 'N',
      data.bibleStudies,
      data.hours,
      remarksCell,
      '',
      '',
      rp,
      '',
      position,
      group
    ],
  ];

  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${data.month}!A9`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });

  return { success: true };
};

export const checkManagerAccess = async (email: string) => {
  await getAccessToken();

  const response = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '집단명!A:C',
  });

  const rows = response.result.values || [];
  const isSuperManager = rows.slice(0, 2).some((row: any[]) => row[2] === email);
  const isGroupManager = rows.slice(4).some((row: any[]) => row[2] === email);

  return isSuperManager || isGroupManager;
};

export const getMonthlyStats = async (month: string, email: string) => {
  await getAccessToken();

  const managerResp = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '집단명!A:C',
  });

  const managerRows = managerResp.result.values || [];
  const isSuperManager = managerRows.slice(0, 2).some((row: any[]) => row[2] === email);
  const groupManagerRow = managerRows.slice(4).find((row: any[]) => row[2] === email);
  const managerGroup = groupManagerRow ? groupManagerRow[0] : null;

  const response = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${month}!A9:L`,
  });

  let rows = response.result.values || [];
  
  if (!isSuperManager && managerGroup) {
    rows = rows.filter((row: any[]) => row[11] === managerGroup);
  }

  const stats = {
    totalReporters: rows.length,
    totalBibleStudies: 0,
    publisherCount: 0,
    rpCount: 0,
    rpHours: 0,
    rpStudies: 0,
    apCount: 0,
    apHours: 0,
    apStudies: 0,
  };

  rows.forEach((row: any[]) => {
    const isRp = (row[8] || '').toUpperCase() === 'RP';
    const isAp = (row[8] || '').toUpperCase() === 'AP';
    const hours = parseInt(row[4] || '0');
    const studies = parseInt(row[3] || '0');

    if (isRp) {
      stats.rpCount++;
      stats.rpHours += hours;
      stats.rpStudies += studies;
    } else if (isAp) {
      stats.apCount++;
      stats.apHours += hours;
      stats.apStudies += studies;
    }
    
    stats.totalBibleStudies += studies;
  });

  stats.publisherCount = stats.totalReporters - stats.rpCount - stats.apCount;
  return stats;
};

export const getMonthStatus = async (month: string) => {
  await getAccessToken();
  
  const response = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${month}!M1`,
  });

  const isClosedValue = response.result.values?.[0]?.[0];
  const isClosed =
    isClosedValue === true ||
    isClosedValue === 'TRUE' ||
    isClosedValue === 'true' ||
    isClosedValue === 1 ||
    isClosedValue === '1';

  return { isClosed };
};

export const toggleMonthStatus = async (month: string, currentStatus: string) => {
  await getAccessToken();

  const newStatus = currentStatus === 'COMPLETED' ? 'CLOSED' : 'COMPLETED';
  
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${month}!M1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[newStatus]]
    }
  });

  return { status: newStatus };
};