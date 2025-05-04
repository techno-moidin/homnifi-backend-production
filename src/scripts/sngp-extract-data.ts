import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

export const getsngpPoints = () => {
  // Define the paths
  const rootFolderPath = path.join(__dirname, '../../');
  const uploadsFolderPath = path.join(rootFolderPath, 'uploads', 'sngp');
  const excelFilePath = path.join(uploadsFolderPath, 'XeraXGI.xlsx');
  const jsonFilePath = path.join(uploadsFolderPath, 'XeraXGI.json');

  // Ensure the uploads/sngp directory exists
  if (!fs.existsSync(uploadsFolderPath)) {
    fs.mkdirSync(uploadsFolderPath, { recursive: true });
  }

  // Read the Excel file
  const workbook = XLSX.readFile(excelFilePath);
  const worksheet = XLSX.utils.sheet_to_json(
    workbook.Sheets[workbook.SheetNames[0]],
    {
      header: 1,
    },
  );

  const headers: string[] = worksheet[0] as string[];
  const data = worksheet.slice(1);

  const records = data
    .map((row) => {
      return headers.reduce((acc, header, index) => {
        acc[header] = row[index];
        return acc;
      }, {});
    })
    .filter((record) => record['Points'] > 0);

  return records;

  // fs.writeFileSync(jsonFilePath, JSON.stringify(records, null, 2));
  // ;
};
