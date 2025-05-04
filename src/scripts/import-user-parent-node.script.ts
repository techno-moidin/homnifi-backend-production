import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

async function convertCsvToJson(filePath: string): Promise<any[]> {
  const results: any[] = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data)) // Collect data row by row
      .on('end', () => resolve(results)) // Resolve the Promise when parsing is complete
      .on('error', (error) => reject(error)); // Reject the Promise if an error occurs
  });
}

(async () => {
  try {
    const csvFileName = 'users.csv'; 
    const outputJsonFileName = 'users.json'; // The name of the output JSON file

    const csvFilePath = path.join(process.cwd(), csvFileName); // Path to the CSV file
    const jsonFilePath = path.join(process.cwd(), outputJsonFileName); // Path for the JSON file

    console.log(`Reading CSV file: ${csvFilePath}`);

    // Ensure the CSV file exists
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`File not found: ${csvFilePath}`);
    }

    // Convert CSV to JSON
    const jsonData = await convertCsvToJson(csvFilePath);

    // Write JSON data to the output file
    await fs.promises.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');
    
    console.log(`JSON data written to file: ${jsonFilePath}`);
  } catch (error) {
    console.error('Error converting CSV to JSON and writing to file:', error.message);
  }
})();
