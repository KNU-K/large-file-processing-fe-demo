import React, { useState } from "react";
import { FaFileUpload, FaCheckCircle, FaSpinner } from "react-icons/fa";
import axios from "axios";
import logo from "./logo.svg";

const App: React.FC = () => {
    const [droppedItems, setDroppedItems] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number[]>([]);
    const [retryCounts, setRetryCounts] = useState<number[]>([]); // State for tracking retries

    const backendUrl = "http://localhost:8080/api/v1/file"; // Replace with your actual backend endpoint

    const uploadChunk = async (chunk: Blob, originalFilename: string, chunkIndex: number, totalChunks: number, retries: number = 3): Promise<number> => {
        const formData = new FormData();

        // Create a chunk-specific filename (e.g., filename_part_001)
        const chunkedFilename = `${originalFilename}_part_${String(chunkIndex + 1).padStart(3, "0")}`;

        formData.append("file", chunk, `${originalFilename}_part_${String(chunkIndex + 1).padStart(3, "0")}`);
        formData.append("filename", chunkedFilename);
        formData.append("originalFilename", originalFilename); // Send original filename to help backend with reassembly
        formData.append("chunkIndex", chunkIndex.toString());
        formData.append("totalChunks", totalChunks.toString());

        console.log(`Uploading ${chunkedFilename} to ${backendUrl}`);

        try {
            await axios.post(backendUrl, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            return 0; // Return 0 on success
        } catch (error) {
            console.error(`Error uploading chunk ${chunkIndex} of ${originalFilename}:`, error);
            return retries - 1; // Return remaining retries
        }
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsUploading(true);

        const files = Array.from(event.dataTransfer.files);
        const progressArray = new Array(files.length).fill(0);
        const retriesArray = new Array(files.length).fill(5); // Initialize retry counts to 5

        if (files.length > 0) {
            files.forEach((file, fileIndex) => {
                const chunkSize = 1024 * 1024; // 5MB per chunk
                const totalChunks = Math.ceil(file.size / chunkSize);

                for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                    const start = chunkIndex * chunkSize;
                    const end = Math.min(file.size, start + chunkSize);
                    const chunk = file.slice(start, end);

                    // Upload each chunk and track progress
                    uploadChunk(chunk, file.name, chunkIndex, totalChunks, retriesArray[fileIndex]).then((remainingRetries) => {
                        if (remainingRetries === 0) {
                            const progressPercentage = Math.floor(((chunkIndex + 1) / totalChunks) * 100);
                            progressArray[fileIndex] = progressPercentage;
                            setUploadProgress([...progressArray]);

                            // Check if all files are fully uploaded
                            if (progressPercentage === 100 && fileIndex === files.length - 1) {
                                setIsUploading(false);
                            }
                        } else {
                            // Update the retry count for the file
                            retriesArray[fileIndex] = remainingRetries;
                            setRetryCounts([...retriesArray]);
                        }
                    });
                }
            });

            setDroppedItems((prev) => [...prev, ...files]);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    const handleRetry = (fileIndex: number, chunkIndex: number) => {
        const file = droppedItems[fileIndex];
        const chunkSize = 1024 * 1024 * 5; // 5MB per chunk
        const totalChunks = Math.ceil(file.size / chunkSize);
        const start = chunkIndex * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const chunk = file.slice(start, end);

        // Retry uploading the chunk
        uploadChunk(chunk, file.name, chunkIndex, totalChunks, retryCounts[fileIndex]).then((remainingRetries) => {
            if (remainingRetries === 0) {
                const progressPercentage = Math.floor(((chunkIndex + 1) / totalChunks) * 100);
                setUploadProgress((prev) => {
                    const newProgress = [...prev];
                    newProgress[fileIndex] = progressPercentage;
                    return newProgress;
                });

                // Check if all files are fully uploaded
                if (progressPercentage === 100) {
                    setIsUploading(false);
                }
            } else {
                // Update the retry count for the file
                setRetryCounts((prev) => {
                    const newRetries = [...prev];
                    newRetries[fileIndex] = remainingRetries;
                    return newRetries;
                });
            }
        });
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
                        {droppedItems.map((item, fileIndex) => (
                            <li key={fileIndex} className="flex items-center justify-between p-2 rounded-lg transition-all duration-300 hover:bg-gray-100">
                                <span className="font-medium text-gray-800">{item.name}</span>
                                <div className="flex items-center space-x-2">
                                    {uploadProgress[fileIndex] === 100 ? <FaCheckCircle className="text-green-500" /> : <FaSpinner className="animate-spin text-blue-500" />}
                                    <span className="text-gray-600">{uploadProgress[fileIndex] || 0}%</span>
                                    {retryCounts[fileIndex] > 0 && uploadProgress[fileIndex] < 100 && (
                                        <button
                                            className="ml-2 text-blue-600 hover:underline"
                                            onClick={() => handleRetry(fileIndex, Math.floor((uploadProgress[fileIndex] / 100) * Math.ceil(item.size / (1024 * 1024 * 5))))} // Calculate the chunk index based on progress
                                        >
                                            Retry
                                        </button>
                                    )}
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
