import React, { useState } from "react";
import { FaFileUpload, FaCheckCircle, FaSpinner } from "react-icons/fa";
import axios from "axios";
import logo from "./logo.svg";

const App: React.FC = () => {
    const [droppedItems, setDroppedItems] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number[]>([]);
    const [retryCounts, setRetryCounts] = useState<number[]>([]);
    const [isChunkedUpload, setIsChunkedUpload] = useState(true); // State to toggle upload method

    const backendUrl = "http://localhost:8080/api/v1/file"; // Replace with your actual backend endpoint

    const uploadFile = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const startTime = performance.now(); // Start timing
        try {
            await axios.post(backendUrl, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            const endTime = performance.now(); // End timing
            const duration = endTime - startTime; // Calculate duration
            console.log(`File ${file.name} uploaded in ${duration.toFixed(2)} ms`);
        } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error);
        }
    };

    const uploadChunk = async (chunk: Blob, originalFilename: string, chunkIndex: number, totalChunks: number, retries: number = 3): Promise<number> => {
        const formData = new FormData();
        const chunkedFilename = `${originalFilename}_part_${String(chunkIndex + 1).padStart(3, "0")}`;
        formData.append("file", chunk, chunkedFilename);
        formData.append("originalFilename", originalFilename);
        formData.append("chunkIndex", chunkIndex.toString());
        formData.append("totalChunks", totalChunks.toString());
        const startTime = performance.now(); // Start timing
        try {
            console.log(backendUrl + "/chunk");
            await axios.post(backendUrl + "/chunk", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            const endTime = performance.now(); // End timing
            const duration = endTime - startTime; // Calculate duration
            console.log(`File ${chunkedFilename} uploaded in ${duration.toFixed(2)} ms`);

            return 0; // Return 0 on success
        } catch (error) {
            console.error(`Error uploading chunk ${chunkIndex} of ${originalFilename}:`, error);
            return retries - 1; // Return remaining retries
        }
    };

    const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsUploading(true);
        const files = Array.from(event.dataTransfer.files);
        const progressArray = new Array(files.length).fill(0);
        const retriesArray = new Array(files.length).fill(5);

        if (files.length > 0) {
            setDroppedItems((prev) => [...prev, ...files]);
            for (const [fileIndex, file] of files.entries()) {
                if (isChunkedUpload) {
                    // Chunk-based upload
                    const chunkSize = 1024 * 1024 * 5; // 5MB per chunk
                    const totalChunks = Math.ceil(file.size / chunkSize);
                    const uploadPromises = [];

                    const fileStartTime = performance.now(); // Start time for the entire file upload

                    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                        const start = chunkIndex * chunkSize;
                        const end = Math.min(file.size, start + chunkSize);
                        const chunk = file.slice(start, end);

                        uploadPromises.push(
                            uploadChunk(chunk, file.name, chunkIndex, totalChunks, retriesArray[fileIndex]).then((remainingRetries) => {
                                if (remainingRetries === 0) {
                                    const progressPercentage = Math.floor(((chunkIndex + 1) / totalChunks) * 100);
                                    progressArray[fileIndex] = progressPercentage;
                                    setUploadProgress([...progressArray]);

                                    // Check if this is the last chunk and update the upload status
                                    if (progressPercentage === 100 && fileIndex === files.length - 1) {
                                        const fileEndTime = performance.now(); // End time for the entire file upload
                                        const fileDuration = fileEndTime - fileStartTime; // Calculate total duration
                                        console.log(`All chunks of ${file.name} uploaded in ${fileDuration.toFixed(2)} ms`);
                                        setIsUploading(false);
                                    }
                                } else {
                                    retriesArray[fileIndex] = remainingRetries;
                                    setRetryCounts([...retriesArray]);
                                }
                            })
                        );
                    }
                    // Wait for all chunks to finish uploading
                    await Promise.all(uploadPromises);
                } else {
                    // Standard upload
                    await uploadFile(file);
                    const progressPercentage = 100; // Assume 100% for a full file upload
                    progressArray[fileIndex] = progressPercentage;
                    setUploadProgress([...progressArray]);

                    if (progressPercentage === 100 && fileIndex === files.length - 1) {
                        setIsUploading(false);
                    }
                }
            }
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

        uploadChunk(chunk, file.name, chunkIndex, totalChunks, retryCounts[fileIndex]).then((remainingRetries) => {
            if (remainingRetries === 0) {
                const progressPercentage = Math.floor(((chunkIndex + 1) / totalChunks) * 100);
                setUploadProgress((prev) => {
                    const newProgress = [...prev];
                    newProgress[fileIndex] = progressPercentage;
                    return newProgress;
                });

                if (progressPercentage === 100) {
                    setIsUploading(false);
                }
            } else {
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

            <div className="mb-4">
                <label className="mr-2">
                    <input type="checkbox" checked={isChunkedUpload} onChange={() => setIsChunkedUpload((prev) => !prev)} />
                    Chunked Upload
                </label>
            </div>

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
                                    {uploadProgress[fileIndex] === 100 ? <FaCheckCircle className="text-green-500" /> : null}
                                    {isUploading && uploadProgress[fileIndex] < 100 ? <FaSpinner className="animate-spin text-gray-500" /> : null}
                                    {retryCounts[fileIndex] > 0 && uploadProgress[fileIndex] < 100 ? (
                                        <button className="text-red-500 hover:underline" onClick={() => handleRetry(fileIndex, uploadProgress[fileIndex])}>
                                            Retry
                                        </button>
                                    ) : null}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default App;
