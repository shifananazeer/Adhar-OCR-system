import express from 'express';
import cors from 'cors';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import fs from 'fs';

const app = express();
const port = 5000;

app.use(cors());
const upload = multer({ dest: 'uploads' });

app.post('/api/ocr', upload.fields([{ name: 'front' }, { name: 'back' }]), async (req, res) => {
  try {
    interface MulterFiles {
      front?: Express.Multer.File[];
      back?: Express.Multer.File[];
    }

    const files = req.files as MulterFiles;
    const frontFile = files.front?.[0];
    const backFile = files.back?.[0];

    if (!frontFile || !backFile) {
     res.status(400).json({ error: 'Both front and back images are required.' });
     return 
    }

    const extractText = async (path: string) => {
      const result = await Tesseract.recognize(path, 'eng');
      return result.data.text;
    };

    const frontText = await extractText(frontFile.path);
    const backText = await extractText(backFile.path);

    console.log("---- ", frontText);

    // Validate if files seem swapped
    const isBackActuallyFront = /DOB|Male|Female/.test(backText);
    const isFrontActuallyBack = /Address|Pincode/.test(frontText);

    if (isBackActuallyFront && isFrontActuallyBack) {
      fs.unlinkSync(frontFile.path);
      fs.unlinkSync(backFile.path);
       res.status(400).json({ error: 'Front and back images appear to be swapped or invalid Aadhaar images.' });
       return
    }

    //Aadhaar content validation
    if (!/DOB|Male|Female|Government/i.test(frontText) || !/Address|Pincode|Kerala|India/i.test(backText)) {
      fs.unlinkSync(frontFile.path);
      fs.unlinkSync(backFile.path);
     res.status(400).json({ error: 'Uploaded images do not appear to contain Aadhaar content. Please upload valid Aadhaar images.' });
     return 
    }

    const nameMatch = frontText.match(/[A-Z][a-z]+ [A-Z][a-z]+/); 
    const cleanedFrontText = frontText.replace(/D0B/g, 'DOB').replace(/[|;]/g, ':');

    let dobMatch = cleanedFrontText.match(/DOB[:\s]*([0-3]?\d[\/\-][01]?\d[\/\-]\d{4})/i);
    if (!dobMatch) {
      dobMatch = cleanedFrontText.match(/\b([0-3]?\d[\/\-][01]?\d[\/\-]\d{4})\b/);
    }

    const genderMatch = frontText.match(/\b(Male|Female|Other)\b/i);
    const aadhaarMatch = frontText.match(/\b\d{4} \d{4} \d{4}\b/);
    const pincodeMatch = backText.match(/\b\d{6}\b/);
    const addressMatch = backText.match(/Address[:\s]*(.*)/i);

    const parseData = {
      name: nameMatch ? nameMatch[0] : '',
      dob: dobMatch ? dobMatch[1] : '',
      gender: genderMatch ? genderMatch[0] : '',
      adhaarNumber: aadhaarMatch ? aadhaarMatch[0] : '',
      address: addressMatch ? addressMatch[1].split('\n')[0] : '',
      pincode: pincodeMatch ? pincodeMatch[0] : '',
    };

    fs.unlinkSync(frontFile.path);
    fs.unlinkSync(backFile.path);
    console.log("parsedata", parseData);
    res.json(parseData);
  } catch (error) {
    console.log('OCR error:', error);
    res.status(500).json({ error: 'OCR processing failed' });
  }
});

app.listen(port, () => {
  console.log(`OCR server running at http://localhost:${port}`);
});
