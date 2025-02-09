'use client';

import React, { useState, useEffect } from 'react';

interface UploadResponse {
  name: string;
  apr: number;
  loan_amount: number;
  loan_term: number;
  confidence: number;
  warnings: any[];
}

export default function BorrowerPage() {
  const [formData, setFormData] = useState({
    name: '',
    apr: '',
    loan_amount: '',
    loan_term: '',
    email: '',
    phone: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isPrivacyChecked, setIsPrivacyChecked] = useState(false);

  useEffect(() => {
    if (uploadResponse) {
      setFormData({
        name: uploadResponse.name || '',
        apr: uploadResponse.apr !== undefined ? uploadResponse.apr.toString() : '',
        loan_amount:
          uploadResponse.loan_amount !== undefined
            ? uploadResponse.loan_amount.toString()
            : '',
        loan_term:
          uploadResponse.loan_term !== undefined
            ? uploadResponse.loan_term.toString()
            : '',
        email: formData.email,
        phone: formData.phone,
      });
    }
  }, [uploadResponse]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      alert('No file selected');
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/`, {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error('Failed to extract data from the file.');
      }

      const extractedData: UploadResponse = await response.json();
      console.log('Extracted data:', extractedData);

      setUploadResponse(extractedData);
      setFileUploaded(true);
    } catch (error) {
      console.error('Error uploading file: ', error);
      setError('There was a problem processing your PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isChecked && isPrivacyChecked) {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/loans/create/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error('Failed to submit loan application');
        }

        // Handle successful submission
        alert('Your loan application has been submitted successfully!');
        // Optionally redirect to a success page or clear the form
      } catch (error) {
        console.error('Error submitting form:', error);
        setError('Failed to submit your application. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Upload Your Loan Estimate
        </h1>

        {!fileUploaded ? (
          <div className="bg-white p-8 rounded-xl shadow-lg text-center mb-8">
            <h2 className="text-xl font-semibold mb-4">Get Started</h2>
            <p className="text-gray-600 mb-6">
              Upload your loan estimate PDF to automatically fill out the form below
            </p>
            <label className="inline-block px-6 py-3 bg-blue-600 text-white font-medium text-sm rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg cursor-pointer transition duration-200">
              <span>Upload Loan Document</span>
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf"
              />
            </label>
          </div>
        ) : null}

        {loading && (
          <div className="text-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-blue-600 font-medium mt-4">Processing your document...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {(fileUploaded || true) && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    APR (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="apr"
                    value={formData.apr}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    Loan Amount ($)
                  </label>
                  <input
                    type="number"
                    name="loan_amount"
                    value={formData.loan_amount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    Loan Term (years)
                  </label>
                  <input
                    type="number"
                    name="loan_term"
                    value={formData.loan_term}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4 mt-8">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => setIsChecked(!isChecked)}
                    className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">
                    I have reviewed the data and confirm it is correct
                  </span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={isPrivacyChecked}
                    onChange={() => setIsPrivacyChecked(!isPrivacyChecked)}
                    className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">
                    I consent to sharing my information with loan officers to receive better rate offers
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!isChecked || !isPrivacyChecked || loading}
                className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors duration-200 ${
                  isChecked && isPrivacyChecked && !loading
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>

              <p className="text-sm text-gray-500 text-center mt-4">
                By clicking Submit, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
} 