const express = require('express');
const cors = require('cors');
const { parse } = require('csv-parse/sync');
const { spawn } = require('child_process');
const app = express();
const port = 5000;
const path = require('path');

app.use(cors({
  origin: '*'
}));

app.use(express.json());
app.use(express.text()); // To handle text/plain input

app.post('/predict', (req, res) => {
    console.log('Received request body:', req.body); // Log the raw request body
    let data;

    if (req.is('text/plain') || req.is('text/csv')) {
        try {
            const parsedData = parse(req.body, { columns: false, skip_empty_lines: true, relax: true });
            console.log('Parsed CSV data:', parsedData);
            if (parsedData.length === 0) {
                return res.status(400).send('No data in CSV');
            }
            const headers = ['age', 'adhd_status', 'playtime_min', 'session_incomplete', 'sc_er', 'sc_de', 'sc_tct', 'sc_rtv', 'wfs_fpr', 'wfs_prc', 'wfs_rt', 'wfs_gs', 'ft_cf', 'ft_mmv', 'ft_eii', 'ft_tp'];
            const parsedDataObj = headers.reduce((obj, header, index) => {
                obj[header] = parsedData[1][index] === undefined || parsedData[1][index] === 'NaN' ? 0 : parseFloat(parsedData[1][index]) || 0;
                return obj;
            }, {});
            delete parsedDataObj.adhd_status;
            data = parsedDataObj; // Use parsedDataObj as data
            console.log('Step 5 - Parsed Data Object:', JSON.stringify(data)); // Log the data object
        } catch (parseError) {
            console.error('CSV Parse Error:', parseError);
            return res.status(400).send('Invalid CSV format');
        }
    } else if (req.is('application/json')) {
        data = req.body;
        delete data.adhd_status;
        console.log('Step 5 - JSON Data:', JSON.stringify(data)); // Log JSON input
    } else {
        console.error('Unsupported content type:', req.get('content-type'));
        return res.status(400).send('Unsupported content type');
    }

    if (!data) {
        console.error('No valid data processed');
        return res.status(400).send('No valid data provided');
    }

    const jsonData = JSON.stringify(data);
    console.log('Step 5 - JSON Sent to Python:', jsonData); // Log JSON sent to model.py
    const pythonProcess = spawn('python', [path.join(__dirname, 'model', 'model.py')], {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    pythonProcess.stdin.write(jsonData);
    pythonProcess.stdin.end();

    let result = '';
    pythonProcess.stdout.on('data', (chunk) => {
        result += chunk.toString().trim();
    });

    pythonProcess.stderr.on('data', (chunk) => {
        console.error('Python Error:', chunk.toString());
    });

    pythonProcess.on('close', (code) => {
        console.log('Raw Python Output:', result);
        if (code === 0) {
            try {
                if (!result) {
                    throw new Error('Empty response from model');
                }
                const jsonResult = JSON.parse(result);
                res.json(jsonResult);
            } catch (jsonError) {
                console.error('JSON Parse Error:', jsonError.message);
                res.status(500).send('Invalid response from model');
            }
        } else {
            console.error(`Python process exited with code ${code}`);
            res.status(500).send('Error running prediction');
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});