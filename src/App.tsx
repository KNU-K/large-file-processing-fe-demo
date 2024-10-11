import React, { useState } from "react";
import { FaFileUpload, FaCheckCircle, FaSpinner } from "react-icons/fa";
import logo from "./logo.svg";

const App: React.FC = () => {
    const [droppedItems, setDroppedItems] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number[]>([]);

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsUploading(true);

        const files = Array.from(event.dataTransfer.files);
        const progressArray = new Array(files.length).fill(0);

        if (files.length > 0) {
            // Log file chunks to the console and simulate upload progress
            files.forEach((file, fileIndex) => {
                console.log(`File: ${file.name}`);
                const chunkSize = 1024 * 1024 * 5; // Example chunk size in bytes
                const totalChunks = Math.ceil(file.size / chunkSize);

                // Simulate chunk uploading and progress tracking
                for (let i = 0; i < totalChunks; i++) {
                    setTimeout(() => {
                        const progressPercentage = Math.floor(((i + 1) / totalChunks) * 100);
                        progressArray[fileIndex] = progressPercentage;
                        setUploadProgress([...progressArray]);

                        if (progressPercentage === 100 && fileIndex === files.length - 1) {
                            setIsUploading(false);
                        }
                    }, i * 200); // Simulating delay between chunk uploads
                }
            });

            setDroppedItems((prev) => [...prev, ...files.map((file) => file.name)]);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100">
            <header className="flex flex-col items-center mb-4">
                <img src={logo} className="App-logo w-24 h-24 transition-transform transform hover:rotate-12 duration-500" alt="logo" />
                <p className="mt-2 text-xl font-semibold text-gray-800">Enhanced Drag & Drop</p>
            </header>

            <div
                className="flex flex-col items-center justify-center border-4 border-dashed border-gray-400 p-8 rounded-lg w-3/5 lg:w-1/2 bg-white shadow-lg transition-all duration-500 hover:shadow-xl hover:bg-gray-50"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                <div className="flex flex-col items-center mb-4">
                    <FaFileUpload size={50} className="text-gray-500 hover:text-indigo-500 transition-colors duration-300" />
                    <p className="mt-4 text-center text-lg font-medium text-gray-600">Drag and Drop Files Here</p>
                </div>

                {droppedItems.length === 0 ? (
                    <p className="text-gray-400 italic">No files uploaded yet.</p>
                ) : (
                    <ul className="list-disc list-inside w-full">
                        {droppedItems.map((item, index) => (
                            <li key={index} className="flex items-center justify-between p-2 rounded-lg transition-all duration-300 hover:bg-gray-100">
                                <span className="font-medium text-gray-800">{item}</span>
                                <div className="flex items-center space-x-2">
                                    {uploadProgress[index] === 100 ? <FaCheckCircle className="text-green-500" /> : <FaSpinner className="animate-spin text-blue-500" />}
                                    <span className="text-gray-600">{uploadProgress[index] || 0}%</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {isUploading && <p className="text-blue-500 mt-4">Uploading in progress...</p>}
            </div>
        </div>
    );
};

export default App;
