import React, { useState, useCallback } from 'react';
import axios from 'axios';
import Cropper from 'react-easy-crop';
import { Slider } from '@mui/material';

interface ParseData {
  name?: string;
  dob?: string;
  gender?: string;
  adhaarNumber?: string;
  address?: string;
  pincode?: string;
  [key: string]: any;
}

type CropTarget = 'front' | 'back' | null;

const AadhaarOCR = () => {
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [parseData, setParseData] = useState<ParseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage] = useState<string | null>(null);

  // Cropping
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [target, setTarget] = useState<CropTarget>(null);

  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, type: CropTarget) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setShowCropper(true);
        setTarget(type);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImg = async (): Promise<Blob | null> => {
    if (!imageSrc || !croppedAreaPixels) return null;

    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || null);
      }, 'image/jpeg');
    });
  };

  const handleCropSave = async () => {
    const blob = await getCroppedImg();
    if (blob && target) {
      const file = new File([blob], `${target}-aadhaar.jpg`, { type: 'image/jpeg' });
      const preview = URL.createObjectURL(blob);

      if (target === 'front') {
        setFrontImage(file);
        setFrontPreview(preview);
      } else {
        setBackImage(file);
        setBackPreview(preview);
      }

      setShowCropper(false);
      setImageSrc(null);
      setTarget(null);
    }
  };

  const handleDelete = (type: CropTarget) => {
    if (type === 'front') {
      setFrontImage(null);
      setFrontPreview(null);
    } else if (type === 'back') {
      setBackImage(null);
      setBackPreview(null);
    }
  };


  const isDataEmpty = (data: ParseData) => {
    return Object.values(data).every((val) => !val || val.trim() === '');
  };

  const handleUpload = async () => {
    if (!frontImage || !backImage) {
      alert('Please upload both front and back images');
      return;
    }
  
    const formData = new FormData();
    formData.append('front', frontImage);
    formData.append('back', backImage);
  
    setIsLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/ocr', formData);
      console.log("data", res.data);
  
      if (isDataEmpty(res.data)) {
        alert('Could not extract data from the uploaded images. Please upload clear Aadhaar images.');
        setParseData(null);  
      } else {
        setParseData(res.data);
      }
    } catch (error) {
      alert('Error parsing image');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white shadow-lg rounded-xl w-full max-w-5xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div>
          <div className="mb-4">
            <label className="block font-semibold">Aadhaar Front</label>
            {frontPreview && (
              <div className="relative">
                <img src={frontPreview} alt="Front" className="w-full rounded-md shadow mb-2" />
                <button
                  onClick={() => handleDelete('front')}
                  className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 text-xs rounded"
                >
                  Delete
                </button>
              </div>
            )}
            {!frontPreview && (
              <input type="file" accept="image/*" onChange={(e) => handleImageSelect(e, 'front')} />
            )}
          </div>
          <div className="mb-4">
            <label className="block font-semibold">Aadhaar Back</label>
            {backPreview && (
              <div className="relative">
                <img src={backPreview} alt="Back" className="w-full rounded-md shadow mb-2" />
                <button
                  onClick={() => handleDelete('back')}
                  className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 text-xs rounded"
                >
                  Delete
                </button>
              </div>
            )}
            {!backPreview && (
              <input type="file" accept="image/*" onChange={(e) => handleImageSelect(e, 'back')} />
            )}
          </div>
          <button
             onClick={handleUpload}
            className={`w-full py-2 mt-2 rounded text-white ${(!frontImage || !backImage || isLoading) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            disabled={!frontImage || !backImage || isLoading}
            >
                {isLoading ? 'Processing...' : 'PARSE AADHAAR'}
                </button>
        </div>

        {/* Parsed Result Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Parsed Data</h3>
          {errorMessage ? (
  <p className="text-red-500">{errorMessage}</p>
) : parseData ? (
  <div className="space-y-2 text-sm">
    <div><strong>Aadhaar Number:</strong> {parseData.adhaarNumber}</div>
    <div><strong>Name:</strong> {parseData.name}</div>
    <div><strong>Date of Birth:</strong> {parseData.dob}</div>
    <div><strong>Gender:</strong> {parseData.gender}</div>
    <div><strong>Address:</strong> {parseData.address}</div>
    <div><strong>Pincode:</strong> {parseData.pincode}</div>
    <div className="bg-gray-100 p-2 rounded mt-4">
      <strong>API Response:</strong>
      <pre className="whitespace-pre-wrap">{JSON.stringify(parseData, null, 2)}</pre>
    </div>
  </div>
) : (
  <p className="text-gray-500">Start performing OCR by inputting your Aadhaar front and back.</p>
)}
        </div>
      </div>

      {/* Cropper Modal */}
      {showCropper && imageSrc && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex flex-col items-center justify-center">
          <div className="relative w-[90vw] max-w-md h-[60vh] bg-white rounded shadow overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={4 / 3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <div className="mt-4 w-72">
            <Slider
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(_, val) => setZoom(val as number)}
            />
            <div className="flex justify-between mt-2">
              <button onClick={handleCropSave} className="bg-blue-600 text-white px-4 py-1 rounded">
                Save
              </button>
              <button onClick={() => setShowCropper(false)} className="bg-gray-600 text-white px-4 py-1 rounded">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AadhaarOCR;
