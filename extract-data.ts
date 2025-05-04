import * as XLSX from 'xlsx';
import fs from 'fs';

const file = './Wallets.xlsx';
const sheetName = 'USDK';

const workbook = XLSX.readFile(file);
const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
  header: 1,
});

const headers: string[] = worksheet[0] as string[];
const data = worksheet.slice(1);

const records = data.map((row) => {
  return headers.reduce((acc, header, index) => {
    acc[header] = row[index];
    return acc;
  }, {});
});

fs.writeFileSync('data.json', JSON.stringify(records, null, 2));
;
