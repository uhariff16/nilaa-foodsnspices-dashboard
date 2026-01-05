import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { parseExcelFile } from '../utils/excelParser';
import { parseProductionFile } from '../utils/productionParser';

const FileUpload = ({ onDataLoaded, onProductionLoaded }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const processFiles = async (files) => {
        setIsProcessing(true);
        setError(null);
        try {
            const fileArray = Array.from(files);

            // 1. Try passing to Excel/Sales Parser
            try {
                const data = await parseExcelFile(fileArray);
                if (data.transactions.length > 0 || data.items.length > 0) {
                    // Check if parent provided a handler for Sales Data
                    if (onDataLoaded) onDataLoaded(data);
                }
            } catch (err) {
                console.warn("Excel parser skipped some files:", err);
            }

            // 2. Try passing to Production Parser
            if (onProductionLoaded) {
                try {
                    const pData = await parseProductionFile(fileArray);
                    if (pData.stockIn.length > 0 || pData.preProduction.length > 0 || pData.postProduction.length > 0) {
                        onProductionLoaded(pData);
                    }
                } catch (err) {
                    console.warn("Production parser skipped some files:", err);
                }
            }
        } catch (err) {
            setError("Failed to parse files. Please ensure they are valid Excel files.");
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processFiles(files);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files.length > 0) {
            processFiles(e.target.files);
        }
    };

    return (
        <div className="flex-center" style={{ minHeight: '60vh' }}>
            <div
                className={`glass-panel animate-fade-in`}
                style={{
                    padding: '4rem',
                    textAlign: 'center',
                    border: isDragging ? '2px dashed var(--accent-primary)' : '1px solid var(--glass-border)',
                    width: '100%',
                    maxWidth: '600px',
                    position: 'relative'
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".xlsx, .xls"
                    multiple
                    style={{ display: 'none' }}
                />

                <input
                    type="file"
                    ref={folderInputRef}
                    onChange={handleFileSelect}
                    webkitdirectory=""
                    directory=""
                    multiple
                    style={{ display: 'none' }}
                />

                <div className="flex-center" style={{ marginBottom: '1.5rem' }}>
                    {isProcessing ? (
                        <Loader2 size={64} className="animate-spin" color="var(--accent-primary)" />
                    ) : (
                        <FileSpreadsheet size={64} color={isDragging ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                    )}
                </div>

                <h2 style={{ marginBottom: '1rem' }}>
                    {isProcessing ? 'Processing Data...' : 'Upload Financial Data'}
                </h2>

                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    Drag and drop your Excel files here.
                </p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button
                        className="btn-primary"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Select Files
                    </button>
                    <button
                        className="btn-primary"
                        style={{ background: 'transparent', border: '1px solid var(--glass-border)', boxShadow: 'none' }}
                        onClick={() => folderInputRef.current?.click()}
                    >
                        Select Folder
                    </button>
                </div>

                {error && (
                    <div style={{ color: 'var(--danger)', marginTop: '1rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileUpload;
