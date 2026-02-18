export const loadGapi = (callback) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
        window.gapi.load('client:picker', callback);
    };
    document.body.appendChild(script);
};

export const loadGis = (callback) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = callback;
    document.body.appendChild(script);
};

export const createPicker = ({ token, apiKey, appId, onSelect, selectFolder = false }) => {
    try {
        if (window.google && window.google.picker) {
            const viewId = selectFolder ? window.google.picker.ViewId.FOLDERS : window.google.picker.ViewId.DOCS;
            const view = new window.google.picker.DocsView(viewId);

            if (selectFolder) {
                view.setMimeTypes('application/vnd.google-apps.folder');
                view.setSelectFolderEnabled(true);
            } else {
                view.setMimeTypes('application/vnd.google-apps.spreadsheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            }

            const pickerBuilder = new window.google.picker.PickerBuilder()
                .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
                .setDeveloperKey(apiKey)
                .setAppId(appId)
                .setOAuthToken(token)
                .addView(view)
                .setCallback((data) => {
                    if (data.action === window.google.picker.Action.PICKED) {
                        const doc = data.docs[0];
                        onSelect({ fileId: doc.id, fileName: doc.name, accessToken: token });
                    }
                });

            if (selectFolder) {
                pickerBuilder.enableFeature(window.google.picker.Feature.SUPPORT_DRIVES);
            } else {
                pickerBuilder.enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED);
            }

            const picker = pickerBuilder.build();
            picker.setVisible(true);
        } else {
            console.error("Google Picker API not loaded");
            alert("Google Picker API failed to load. Please check your internet connection.");
        }
    } catch (err) {
        console.error("Picker Error:", err);
        alert("Failed to create Google Picker: " + err.message);
    }
};

export const downloadDriveFile = async (fileId, accessToken) => {
    try {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) throw new Error('Failed to download file from Drive');

        const blob = await response.blob();
        return blob;
    } catch (error) {
        console.error("Drive Download Error:", error);
        throw error;
    }
};

// Helper to list files in a specific folder
const listFilesInFolder = async (folderId, accessToken) => {
    // Query for files AND folders
    // We need to find: 
    // 1. Spreadsheets in this folder
    // 2. Subfolders in this folder

    const q = `'${folderId}' in parents and trashed=false and (mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.ms-excel' or mimeType='application/vnd.google-apps.folder')`;

    // Removed Try/Catch to allow errors (like 401) to propagate to caller
    let allItems = [];
    let pageToken = null;

    do {
        const url = new URL('https://www.googleapis.com/drive/v3/files');
        url.searchParams.append('q', q);
        url.searchParams.append('fields', 'nextPageToken, files(id, name, modifiedTime, mimeType)');
        url.searchParams.append('pageSize', '1000'); // Max page size
        if (pageToken) url.searchParams.append('pageToken', pageToken);

        const response = await fetch(url.toString(), {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Failed to list files: ${response.status} ${response.statusText} - ${errText}`);
        }

        const data = await response.json();

        if (data.files) allItems = [...allItems, ...data.files];
        pageToken = data.nextPageToken;
    } while (pageToken);

    return allItems;
};

export const listDriveFiles = async (folderId, accessToken) => {
    try {
        let allSpreadsheets = [];
        let foldersToProcess = [folderId];
        let processedFolders = new Set();

        while (foldersToProcess.length > 0) {
            const currentFolderId = foldersToProcess.shift();
            if (processedFolders.has(currentFolderId)) continue;
            processedFolders.add(currentFolderId);

            const items = await listFilesInFolder(currentFolderId, accessToken);

            // Separate files and folders
            const spreadsheets = items.filter(i => i.mimeType !== 'application/vnd.google-apps.folder');
            const subfolders = items.filter(i => i.mimeType === 'application/vnd.google-apps.folder');

            allSpreadsheets = [...allSpreadsheets, ...spreadsheets];

            // Add subfolders to queue
            subfolders.forEach(f => foldersToProcess.push(f.id));
        }

        return allSpreadsheets;
    } catch (error) {
        console.error("Recursive List Error:", error);
        throw error;
    }
};
