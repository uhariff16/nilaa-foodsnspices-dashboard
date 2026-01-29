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

export const createPicker = ({ token, apiKey, onSelect }) => {
    if (window.google && window.google.picker) {
        const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
        view.setMimeTypes('application/vnd.google-apps.spreadsheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        const picker = new window.google.picker.PickerBuilder()
            .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
            .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
            .setDeveloperKey(apiKey)
            .setAppId("PROJECT_ID_PLACEHOLDER") // Optional but good practice
            .setOAuthToken(token)
            .addView(view)
            .setCallback((data) => {
                if (data.action === window.google.picker.Action.PICKED) {
                    const fileId = data.docs[0].id;
                    const fileName = data.docs[0].name;
                    onSelect({ fileId, fileName, accessToken: token });
                }
            })
            .build();
        picker.setVisible(true);
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
